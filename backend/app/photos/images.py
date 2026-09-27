from io import BytesIO
import warnings
from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_PIXELS = 24_000_000


def normalize_image(data: bytes) -> tuple[bytes, int, int]:
    if not data:
        raise HTTPException(422, '写真を選択してください')
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(413, '写真は10MB以内にしてください')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as source:
                if source.format not in {'JPEG', 'PNG', 'WEBP'}:
                    raise HTTPException(415, 'JPEG・PNG・WebPの写真を選んでください')
                if source.width * source.height > MAX_PIXELS:
                    raise HTTPException(413, '写真は2400万画素以内にしてください')
                if getattr(source, 'is_animated', False):
                    raise HTTPException(415, 'アニメーション画像は保存できません')
                source.load()
                oriented = ImageOps.exif_transpose(source)
                oriented.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
                # Fresh pixels: EXIF/GPS/XMP/ICC and original filename never survive.
                clean = Image.new('RGB', oriented.size, 'white')
                rgba = oriented.convert('RGBA')
                clean.paste(rgba, mask=rgba.getchannel('A'))
                output = BytesIO()
                clean.save(output, format='JPEG', quality=85, optimize=True)
                return output.getvalue(), clean.width, clean.height
    except (Image.DecompressionBombWarning, Image.DecompressionBombError):
        raise HTTPException(413, '写真の解像度が大きすぎます')
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(415, '画像を読み込めません。別の写真を選んでください')
