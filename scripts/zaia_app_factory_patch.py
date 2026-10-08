#!/usr/bin/env python3
import json
import sys
from pathlib import Path

def fail(msg):
    raise SystemExit(msg)

def patch_manifest(path):
    p=Path(path)
    data=json.loads(p.read_text(encoding='utf-8'))
    local='http://127.0.0.1:8765/logo.png'
    data['iconUrl']=local
    data['maskableIconUrl']=local
    data['monochromeIconUrl']=local
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

def patch_android(root_path, expected_package):
    root_dir=Path(root_path)
    gs=root_dir/'app/google-services.json'
    data=json.loads(gs.read_text(encoding='utf-8'))
    packages=[
        c.get('client_info',{}).get('android_client_info',{}).get('package_name')
        for c in data.get('client',[])
    ]
    if expected_package not in packages:
        fail(f'Firebase nao contem o pacote {expected_package}. Encontrados: {packages}')

    root=root_dir/'build.gradle'
    text=root.read_text(encoding='utf-8')
    marker="classpath 'com.android.tools.build:gradle:"
    if 'com.google.gms:google-services' not in text:
        pos=text.find(marker)
        if pos < 0:
            fail('Android Gradle Plugin nao encontrado.')
        end=text.find('\n',pos)
        text=text[:end+1]+"        classpath 'com.google.gms:google-services:4.5.0'\n"+text[end+1:]
        root.write_text(text,encoding='utf-8')

    app=root_dir/'app/build.gradle'
    text=app.read_text(encoding='utf-8')
    if "apply plugin: 'com.google.gms.google-services'" not in text:
        start=text.find('plugins {')
        end=text.find('}\n',start)
        if start < 0 or end < 0:
            fail('Bloco plugins nao encontrado.')
        end += 2
        text=text[:end]+"\napply plugin: 'com.google.gms.google-services'\n"+text[end:]
    if 'com.google.firebase:firebase-messaging' not in text:
        start=text.find('dependencies {')
        if start < 0:
            fail('Bloco dependencies nao encontrado.')
        pos=start+len('dependencies {')
        deps="\n    implementation platform('com.google.firebase:firebase-bom:34.19.0')\n    implementation 'com.google.firebase:firebase-messaging'\n"
        text=text[:pos]+deps+text[pos:]
    app.write_text(text,encoding='utf-8')

    manifest=root_dir/'app/src/main/AndroidManifest.xml'
    text=manifest.read_text(encoding='utf-8')
    if 'android.permission.POST_NOTIFICATIONS' not in text:
        end=text.find('>',text.find('<manifest'))
        if end < 0:
            fail('Tag manifest nao encontrada.')
        text=text[:end+1]+'\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>'+text[end+1:]

    service='''
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
    '''
    if '.ZaiaFirebaseMessagingService' not in text:
        text=text.replace('</application>',service+'\n    </application>')
    manifest.write_text(text,encoding='utf-8')

if len(sys.argv) < 3:
    fail('Uso: zaia_app_factory_patch.py manifest <manifest.json> | android <root> <package>')

mode=sys.argv[1]
if mode=='manifest' and len(sys.argv)==3:
    patch_manifest(sys.argv[2])
elif mode=='android' and len(sys.argv)==4:
    patch_android(sys.argv[2],sys.argv[3])
else:
    fail('Argumentos invalidos.')
