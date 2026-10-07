#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

REQUIRED = [
    "establishmentId","appName","artifactSlug","packageId","host",
    "themeColor","backgroundColor","logoUrl","channelName",
    "channelDescription","firebaseConfigPath","keystoreB64Path",
    "keyAlias","versionName","versionCode"
]

def fail(message):
    raise SystemExit(message)

if len(sys.argv) != 3:
    fail("Uso: generate_store_android.py <config.json> <output_dir>")

config_path = Path(sys.argv[1])
output_dir = Path(sys.argv[2])
config = json.loads(config_path.read_text(encoding="utf-8"))

missing = [k for k in REQUIRED if config.get(k) in (None, "")]
if missing:
    fail("Campos obrigatórios ausentes: " + ", ".join(missing))

package_id = str(config["packageId"]).strip()
if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){2,}", package_id):
    fail("packageId Android inválido: " + package_id)

establishment_id = str(config["establishmentId"]).strip()
if not re.fullmatch(r"[0-9a-fA-F-]{36}", establishment_id):
    fail("establishmentId inválido.")

host = str(config["host"]).strip().lower()
if not re.fullmatch(r"[a-z0-9.-]+", host):
    fail("host inválido.")

output_dir.mkdir(parents=True, exist_ok=True)

replacements = {
    "{{PACKAGE_ID}}": package_id,
    "{{APP_NAME}}": str(config["appName"]).replace('"', '\"'),
    "{{HOST}}": host,
    "{{CHANNEL_NAME}}": str(config["channelName"]).replace('"', '\"'),
    "{{CHANNEL_DESCRIPTION}}": str(config["channelDescription"]).replace('"', '\"'),
}

template_root = Path("native/templates/android")
for template_name, output_name in [
    ("LauncherActivity.java.tpl", "LauncherActivity.java"),
    ("ZaiaFirebaseMessagingService.java.tpl", "ZaiaFirebaseMessagingService.java"),
]:
    content = (template_root / template_name).read_text(encoding="utf-8")
    for key, value in replacements.items():
        content = content.replace(key, value)
    if "{{" in content or "}}" in content:
        fail(f"Placeholder não resolvido em {template_name}")
    (output_dir / output_name).write_text(content, encoding="utf-8")

manifest = {
    "packageId": package_id,
    "host": host,
    "name": config["appName"],
    "launcherName": config["appName"],
    "display": "standalone",
    "themeColor": config["themeColor"],
    "themeColorDark": config["themeColor"],
    "navigationColor": config["themeColor"],
    "navigationColorDark": config["themeColor"],
    "navigationDividerColor": config["themeColor"],
    "navigationDividerColorDark": config["themeColor"],
    "backgroundColor": config["backgroundColor"],
    "enableNotifications": False,
    "startUrl": f"/loja?app={establishment_id}&source=android",
    "iconUrl": config["logoUrl"],
    "maskableIconUrl": config["logoUrl"],
    "monochromeIconUrl": config["logoUrl"],
    "splashScreenFadeOutDuration": 250,
    "signingKey": {"path": "android.keystore", "alias": config["keyAlias"]},
    "appVersionName": config["versionName"],
    "appVersionCode": int(config["versionCode"]),
    "shortcuts": [],
    "generatorApp": "zaia-app-factory",
    "webManifestUrl": f"https://{host}/manifest-loja.webmanifest",
    "fallbackType": "customtabs",
    "features": {},
    "alphaDependencies": {"enabled": False},
    "enableSiteSettingsShortcut": True,
    "isChromeOSOnly": False,
    "isMetaQuest": False,
    "fullScopeUrl": f"https://{host}/",
    "minSdkVersion": 23,
    "orientation": "default",
    "fingerprints": ([{"value": config["fingerprint"]}] if config.get("fingerprint") else []),
    "additionalTrustedOrigins": [],
    "retainedBundles": [],
    "appVersion": config["versionName"],
}
(output_dir / "twa-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

assetlinks_entry = {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
        "namespace": "android_app",
        "package_name": package_id,
        "sha256_cert_fingerprints": [config["fingerprint"]] if config.get("fingerprint") else [],
    },
}
(output_dir / "assetlinks-entry.json").write_text(
    json.dumps(assetlinks_entry, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

metadata = {
    "establishmentId": establishment_id,
    "appName": config["appName"],
    "artifactSlug": config["artifactSlug"],
    "packageId": package_id,
    "logoUrl": config["logoUrl"],
    "firebaseConfigPath": config["firebaseConfigPath"],
    "keystoreB64Path": config["keystoreB64Path"],
    "keyAlias": config["keyAlias"],
    "versionName": config["versionName"],
    "versionCode": int(config["versionCode"]),
}
(output_dir / "build-metadata.json").write_text(
    json.dumps(metadata, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

print(json.dumps(metadata, ensure_ascii=False))
