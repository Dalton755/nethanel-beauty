#!/usr/bin/env python3
from pathlib import Path
import json
import os
import sys

if len(sys.argv) != 2:
    raise SystemExit("Uso: patch_store_android_project.py <package_id>")

package_id = sys.argv[1]
google = Path("app/google-services.json")
if not google.exists():
    raise SystemExit("google-services.json não encontrado.")

data = json.loads(google.read_text(encoding="utf-8"))
packages = [
    c.get("client_info", {}).get("android_client_info", {}).get("package_name")
    for c in data.get("client", [])
]
if package_id not in packages:
    raise SystemExit(f"Firebase não contém o pacote {package_id}. Encontrados: {packages}")

root = Path("build.gradle")
root_text = root.read_text(encoding="utf-8")
marker = "classpath 'com.android.tools.build:gradle:"
if "com.google.gms:google-services" not in root_text:
    pos = root_text.find(marker)
    if pos < 0:
        raise SystemExit("Android Gradle Plugin não encontrado.")
    line_end = root_text.find("\n", pos)
    root_text = (
        root_text[: line_end + 1]
        + "        classpath 'com.google.gms:google-services:4.5.0'\n"
        + root_text[line_end + 1 :]
    )
    root.write_text(root_text, encoding="utf-8")

app = Path("app/build.gradle")
app_text = app.read_text(encoding="utf-8")
if "apply plugin: 'com.google.gms.google-services'" not in app_text:
    plugin_end = app_text.find("}\n", app_text.find("plugins {"))
    if plugin_end < 0:
        raise SystemExit("Bloco plugins não encontrado.")
    plugin_end += 2
    app_text = (
        app_text[:plugin_end]
        + "\napply plugin: 'com.google.gms.google-services'\n"
        + app_text[plugin_end:]
    )

if "com.google.firebase:firebase-messaging" not in app_text:
    dep_start = app_text.find("dependencies {")
    if dep_start < 0:
        raise SystemExit("Bloco dependencies não encontrado.")
    insert = dep_start + len("dependencies {")
    firebase = (
        "\n    implementation platform('com.google.firebase:firebase-bom:34.19.0')"
        "\n    implementation 'com.google.firebase:firebase-messaging'\n"
    )
    app_text = app_text[:insert] + firebase + app_text[insert:]
app.write_text(app_text, encoding="utf-8")

manifest = Path("app/src/main/AndroidManifest.xml")
manifest_text = manifest.read_text(encoding="utf-8")
if "android.permission.POST_NOTIFICATIONS" not in manifest_text:
    manifest_end = manifest_text.find(">", manifest_text.find("<manifest"))
    if manifest_end < 0:
        raise SystemExit("Tag manifest não encontrada.")
    manifest_text = (
        manifest_text[: manifest_end + 1]
        + '\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>'
        + manifest_text[manifest_end + 1 :]
    )

service_block = """
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_icon"
            android:resource="@drawable/ic_stat_zaia" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_color"
            android:resource="@color/colorPrimary" />
        <meta-data
            android:name="com.google.firebase.messaging.default_notification_channel_id"
            android:value="zaia_store_notifications" />
        <service
            android:name=".ZaiaFirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>
"""
if ".ZaiaFirebaseMessagingService" not in manifest_text:
    manifest_text = manifest_text.replace(
        "</application>", service_block + "\n    </application>"
    )
manifest.write_text(manifest_text, encoding="utf-8")
