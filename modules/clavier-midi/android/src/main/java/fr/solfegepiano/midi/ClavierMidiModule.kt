package fr.solfegepiano.midi

import android.annotation.SuppressLint
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.media.midi.MidiDevice
import android.media.midi.MidiDeviceInfo
import android.media.midi.MidiManager
import android.media.midi.MidiOutputPort
import android.media.midi.MidiReceiver
import android.os.Handler
import android.os.Looper
import android.os.ParcelUuid
import androidx.core.os.bundleOf
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Clavier MIDI pour Solfège Piano : claviers USB (branchés au téléphone par un
 * adaptateur OTG) et claviers Bluetooth MIDI (BLE), via android.media.midi.
 *
 * Événements envoyés au JavaScript :
 *  - onNote { note, velocite, appuye } : touche enfoncée (appuye = true) ou relâchée ;
 *  - onAppareils { appareils } : la liste des claviers a changé (branchement USB…) ;
 *  - onAppareilBluetooth { adresse, nom } : clavier Bluetooth trouvé pendant une recherche ;
 *  - onConnexion { connecte, nom } : connexion ou déconnexion du clavier.
 */
class ClavierMidiModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val handler = Handler(Looper.getMainLooper())
  private var midiManager: MidiManager? = null
  private var appareilOuvert: MidiDevice? = null
  private val portsOuverts = mutableListOf<MidiOutputPort>()
  private var rappelAppareils: MidiManager.DeviceCallback? = null
  private var rappelScan: ScanCallback? = null

  override fun definition() = ModuleDefinition {
    Name("ClavierMidi")

    Events("onNote", "onAppareils", "onAppareilBluetooth", "onConnexion")

    OnCreate {
      if (context.packageManager.hasSystemFeature(PackageManager.FEATURE_MIDI)) {
        val manager = context.getSystemService(Context.MIDI_SERVICE) as? MidiManager
        midiManager = manager
        val rappel = object : MidiManager.DeviceCallback() {
          override fun onDeviceAdded(device: MidiDeviceInfo) {
            sendEvent("onAppareils", bundleOf("appareils" to lister()))
          }

          override fun onDeviceRemoved(device: MidiDeviceInfo) {
            if (appareilOuvert?.info?.id == device.id) {
              fermer()
              sendEvent("onConnexion", bundleOf("connecte" to false, "nom" to nomDe(device)))
            }
            sendEvent("onAppareils", bundleOf("appareils" to lister()))
          }
        }
        @Suppress("DEPRECATION")
        manager?.registerDeviceCallback(rappel, handler)
        rappelAppareils = rappel
      }
    }

    OnDestroy {
      arreterScan()
      fermer()
      rappelAppareils?.let { midiManager?.unregisterDeviceCallback(it) }
    }

    /** Le téléphone gère-t-il le MIDI ? */
    Function("estDisponible") {
      midiManager != null
    }

    /** Claviers branchés ou appairés qui envoient des notes. */
    Function("listerAppareils") {
      lister()
    }

    /** Ouvre un clavier de la liste et écoute toutes ses sorties. */
    AsyncFunction("connecter") { id: Int, promise: Promise ->
      val manager = midiManager ?: return@AsyncFunction promise.reject("MIDI_INDISPONIBLE", "MIDI non disponible", null)
      @Suppress("DEPRECATION")
      val info = manager.devices.firstOrNull { it.id == id }
        ?: return@AsyncFunction promise.reject("MIDI_INTROUVABLE", "Clavier introuvable", null)
      manager.openDevice(info, { appareil ->
        if (appareil == null) {
          promise.reject("MIDI_OUVERTURE", "Impossible d'ouvrir le clavier", null)
        } else {
          ouvrir(appareil)
          promise.resolve(nomDe(info))
        }
      }, handler)
    }

    Function("deconnecter") {
      fermer()
    }

    /** Cherche les claviers Bluetooth MIDI pendant `dureeMs` (les permissions sont demandées côté JavaScript). */
    Function("scannerBluetooth") { dureeMs: Int ->
      scanner(dureeMs.toLong())
    }

    Function("arreterScan") {
      arreterScan()
    }

    /** Se connecte à un clavier Bluetooth trouvé par la recherche. */
    AsyncFunction("connecterBluetooth") { adresse: String, promise: Promise ->
      val manager = midiManager ?: return@AsyncFunction promise.reject("MIDI_INDISPONIBLE", "MIDI non disponible", null)
      val adaptateur = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
        ?: return@AsyncFunction promise.reject("BLUETOOTH_INDISPONIBLE", "Bluetooth non disponible", null)
      arreterScan()
      try {
        val appareilBt = adaptateur.getRemoteDevice(adresse)
        manager.openBluetoothDevice(appareilBt, { appareil ->
          if (appareil == null) {
            promise.reject("MIDI_OUVERTURE", "Impossible de se connecter au clavier", null)
          } else {
            ouvrir(appareil)
            promise.resolve(nomDe(appareil.info))
          }
        }, handler)
      } catch (e: SecurityException) {
        promise.reject("BLUETOOTH_PERMISSION", "Autorisation Bluetooth refusée", e)
      } catch (e: IllegalArgumentException) {
        promise.reject("BLUETOOTH_ADRESSE", "Adresse Bluetooth invalide", e)
      }
    }
  }

  /* ---------- Appareils ---------- */

  private fun nomDe(info: MidiDeviceInfo): String {
    val p = info.properties
    return p.getString(MidiDeviceInfo.PROPERTY_NAME)
      ?: listOfNotNull(p.getString(MidiDeviceInfo.PROPERTY_MANUFACTURER), p.getString(MidiDeviceInfo.PROPERTY_PRODUCT))
        .joinToString(" ")
        .ifBlank { "Clavier MIDI" }
  }

  private fun lister(): List<Map<String, Any>> {
    val manager = midiManager ?: return emptyList()
    @Suppress("DEPRECATION")
    return manager.devices
      .filter { it.outputPortCount > 0 } // les claviers envoient des notes par leurs sorties
      .map {
        mapOf(
          "id" to it.id,
          "nom" to nomDe(it),
          "type" to when (it.type) {
            MidiDeviceInfo.TYPE_USB -> "usb"
            MidiDeviceInfo.TYPE_BLUETOOTH -> "bluetooth"
            else -> "virtuel"
          },
          "connecte" to (appareilOuvert?.info?.id == it.id),
        )
      }
  }

  private fun ouvrir(appareil: MidiDevice) {
    fermer()
    appareilOuvert = appareil
    for (i in 0 until appareil.info.outputPortCount) {
      appareil.openOutputPort(i)?.let { port ->
        port.connect(Recepteur())
        portsOuverts.add(port)
      }
    }
    sendEvent("onConnexion", bundleOf("connecte" to true, "nom" to nomDe(appareil.info)))
  }

  private fun fermer() {
    portsOuverts.forEach { runCatching { it.close() } }
    portsOuverts.clear()
    appareilOuvert?.let { runCatching { it.close() } }
    appareilOuvert = null
  }

  /* ---------- Bluetooth ---------- */

  @SuppressLint("MissingPermission")
  private fun scanner(dureeMs: Long) {
    val adaptateur = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter ?: return
    val scannerBle = adaptateur.bluetoothLeScanner ?: return
    arreterScan()
    val vus = mutableSetOf<String>()
    val rappel = object : ScanCallback() {
      override fun onScanResult(callbackType: Int, result: ScanResult) {
        val adresse = result.device.address
        if (vus.add(adresse)) {
          val nom = runCatching { result.device.name }.getOrNull() ?: result.scanRecord?.deviceName ?: "Clavier Bluetooth"
          sendEvent("onAppareilBluetooth", bundleOf("adresse" to adresse, "nom" to nom))
        }
      }
    }
    // Service « MIDI over Bluetooth LE » (spécification MMA)
    val filtre = ScanFilter.Builder().setServiceUuid(ParcelUuid.fromString(UUID_SERVICE_MIDI)).build()
    val reglages = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
    try {
      scannerBle.startScan(listOf(filtre), reglages, rappel)
      rappelScan = rappel
      handler.postDelayed({ arreterScan() }, dureeMs)
    } catch (e: SecurityException) {
      // Autorisation refusée : la recherche ne démarre pas
    }
  }

  @SuppressLint("MissingPermission")
  private fun arreterScan() {
    val rappel = rappelScan ?: return
    rappelScan = null
    runCatching {
      (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter?.bluetoothLeScanner?.stopScan(rappel)
    }
  }

  /* ---------- Lecture des messages MIDI ---------- */

  /** Décode les messages « note on » / « note off » (avec le « running status »). */
  private inner class Recepteur : MidiReceiver() {
    private var statut = 0
    private val donnees = IntArray(2)
    private var nb = 0

    override fun onSend(msg: ByteArray, offset: Int, count: Int, timestamp: Long) {
      for (i in offset until offset + count) {
        val octet = msg[i].toInt() and 0xFF
        if (octet >= 0xF8) continue // messages temps réel (horloge…), sans effet sur le statut
        if (octet >= 0x80) {
          statut = if (octet < 0xF0) octet else 0 // les messages système interrompent le statut
          nb = 0
          continue
        }
        if (statut == 0) continue
        donnees[nb++] = octet
        val type = statut and 0xF0
        val attendus = if (type == 0xC0 || type == 0xD0) 1 else 2
        if (nb < attendus) continue
        nb = 0
        if (type == 0x90 || type == 0x80) {
          val note = donnees[0]
          val velocite = donnees[1]
          val appuye = type == 0x90 && velocite > 0
          sendEvent("onNote", bundleOf("note" to note, "velocite" to velocite, "appuye" to appuye))
        }
      }
    }
  }

  companion object {
    private const val UUID_SERVICE_MIDI = "03B80E5A-EDE8-4B33-A751-6CE34EC4C700"
  }
}
