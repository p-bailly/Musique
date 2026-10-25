"""
Génère les icônes de l'application (icône, icône adaptative Android,
écran de démarrage, favicon) à partir d'un dessin simple : un clavier
de piano surmonté d'une croche.

Utilisation : python3 scripts/generate-icons.py   (nécessite Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"
INDIGO = (76, 95, 213, 255)
BLANC = (255, 255, 255, 255)
NOIR = (35, 38, 47, 255)
JAUNE = (255, 213, 74, 255)


def dessin(taille: int, echelle: float, monochrome: bool = False) -> Image.Image:
    """Dessine le motif centré sur fond transparent ; `echelle` = part de l'image occupée."""
    img = Image.new("RGBA", (taille, taille), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cote = taille * echelle
    x0 = (taille - cote) / 2
    y0 = (taille - cote) / 2
    blanc = BLANC
    noir = (0, 0, 0, 0) if monochrome else NOIR
    accent = BLANC if monochrome else JAUNE

    # Clavier : 5 touches blanches dans la moitié basse
    kx0, ky0 = x0, y0 + cote * 0.48
    kw, kh = cote, cote * 0.52
    lb = kw / 5
    for i in range(5):
        d.rounded_rectangle(
            [kx0 + i * lb + cote * 0.012, ky0, kx0 + (i + 1) * lb - cote * 0.012, ky0 + kh],
            radius=cote * 0.04,
            fill=accent if i == 2 else blanc,
        )
    # Touches noires
    if not monochrome:
        for i in (1, 2, 4):
            cx = kx0 + i * lb
            d.rounded_rectangle([cx - lb * 0.3, ky0, cx + lb * 0.3, ky0 + kh * 0.58], radius=cote * 0.02, fill=noir)

    # Croche au-dessus du clavier
    tete_r = cote * 0.11
    tx, ty = x0 + cote * 0.38, y0 + cote * 0.33
    d.ellipse([tx - tete_r * 1.25, ty - tete_r, tx + tete_r * 1.25, ty + tete_r], fill=blanc)
    hx = tx + tete_r * 1.15
    epais = cote * 0.045
    d.rectangle([hx - epais, y0 - cote * 0.02, hx, ty], fill=blanc)
    d.polygon(
        [(hx - epais, y0 - cote * 0.02), (hx + cote * 0.2, y0 + cote * 0.12), (hx + cote * 0.2, y0 + cote * 0.2), (hx - epais, y0 + cote * 0.08)],
        fill=blanc,
    )
    return img


def fond(taille: int) -> Image.Image:
    return Image.new("RGBA", (taille, taille), INDIGO)


def main() -> None:
    # Icône principale (iOS) : fond indigo plein + motif
    icone = fond(1024)
    icone.alpha_composite(dessin(1024, 0.62))
    icone.convert("RGB").save(ASSETS / "icon.png")
    # Android adaptatif : motif dans la zone de sécurité (≈ 60 %)
    dessin(1024, 0.5).save(ASSETS / "android-icon-foreground.png")
    fond(1024).save(ASSETS / "android-icon-background.png")
    dessin(1024, 0.5, monochrome=True).save(ASSETS / "android-icon-monochrome.png")
    # Écran de démarrage (sur fond indigo défini dans app.json)
    dessin(1024, 0.8).save(ASSETS / "splash-icon.png")
    # Favicon (web)
    fav = fond(48)
    fav.alpha_composite(dessin(48, 0.7))
    fav.save(ASSETS / "favicon.png")
    print("Icônes générées dans assets/")


if __name__ == "__main__":
    main()
