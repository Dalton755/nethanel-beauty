#!/usr/bin/env bash
set -Eeuo pipefail

FACTORY_URL="https://sxghzubovthsvmfqncch.supabase.co/functions/v1/zaia-app-factory"
mkdir -p .factory .native-build/store/generated

get_oidc() {
  curl --fail --silent --show-error     -H "Authorization: bearer $ACTIONS_ID_TOKEN_REQUEST_TOKEN"     "$ACTIONS_ID_TOKEN_REQUEST_URL&audience=zaia-app-factory" | jq -r '.value'
}

factory_post() {
  local payload="$1"
  local token
  token="$(get_oidc)"
  echo "::add-mask::$token"
  curl --fail-with-body --silent --show-error     -X POST "$FACTORY_URL"     -H "Authorization: Bearer $token"     -H "Content-Type: application/json"     --data-binary "@$payload"
}

printf '%s' '{"mode":"claim"}' > .factory/claim.json
factory_post .factory/claim.json > .factory/job.json

HAS_JOB="$(jq -r '.has_job // false' .factory/job.json)"
if [ "$HAS_JOB" != "true" ]; then
  echo "ZAIA App Factory: nenhum aplicativo aguardando geração."
  exit 0
fi

PROFILE_ID="$(jq -r '.profile_id' .factory/job.json)"
PROFILE_SHORT="$(printf '%s' "$PROFILE_ID" | cut -c1-8)"
PACKAGE_ID="$(jq -r '.package_id' .factory/job.json)"
APP_NAME="$(jq -r '.app_name' .factory/job.json)"
VERSION_NAME="$(jq -r '.version_name' .factory/job.json)"
VERSION_CODE="$(jq -r '.version_code' .factory/job.json)"
ARTIFACT_SLUG="zaia-store-$PROFILE_SHORT"
KEY_ALIAS=""

fail_factory() {
  local rc=$?
  set +e
  jq -n     --arg mode "fail"     --arg profile_id "$PROFILE_ID"     --arg error "Build Android falhou. GitHub Actions: https://github.com/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"     '{mode:$mode,profile_id:$profile_id,error:$error}' > .factory/fail.json
  factory_post .factory/fail.json >/dev/null 2>&1 || true
  exit "$rc"
}
trap fail_factory ERR

jq -r '.google_services_b64' .factory/job.json | base64 -d > .factory/google-services.json

NEEDS_KEY="$(jq -r '.signing.needs_generation // true' .factory/job.json)"
if [ "$NEEDS_KEY" = "true" ]; then
  STORE_PASS="$(openssl rand -hex 20)"
  KEY_PASS="$STORE_PASS"
  KEY_ALIAS="zaia-$(printf '%s' "$PROFILE_ID" | cut -c1-12)"

  echo "::add-mask::$STORE_PASS"
  echo "::add-mask::$KEY_PASS"

  keytool -genkeypair     -keystore .factory/android.keystore     -storetype PKCS12     -storepass "$STORE_PASS"     -keypass "$KEY_PASS"     -alias "$KEY_ALIAS"     -keyalg RSA     -keysize 4096     -validity 10000     -dname "CN=ZAIA-$PROFILE_SHORT, OU=ZAIA App Factory, O=Nethanel Tecnologia, C=BR"     -noprompt

  FINGERPRINT="$(keytool -exportcert -rfc     -keystore .factory/android.keystore     -storepass "$STORE_PASS"     -alias "$KEY_ALIAS" |
    openssl x509 -noout -fingerprint -sha256 |
    cut -d= -f2)"

  KEYSTORE_B64="$(base64 -w0 .factory/android.keystore)"
  echo "::add-mask::$KEYSTORE_B64"

  jq -n     --arg mode "signing_key"     --arg profile_id "$PROFILE_ID"     --arg keystore_b64 "$KEYSTORE_B64"     --arg store_password "$STORE_PASS"     --arg key_password "$KEY_PASS"     --arg key_alias "$KEY_ALIAS"     --arg fingerprint "$FINGERPRINT"     '{mode:$mode,profile_id:$profile_id,keystore_b64:$keystore_b64,store_password:$store_password,key_password:$key_password,key_alias:$key_alias,fingerprint:$fingerprint}'     > .factory/signing.json

  factory_post .factory/signing.json > .factory/signing-response.json
else
  KEYSTORE_B64="$(jq -r '.signing.keystore_b64' .factory/job.json)"
  STORE_PASS="$(jq -r '.signing.store_password' .factory/job.json)"
  KEY_PASS="$(jq -r '.signing.key_password' .factory/job.json)"
  KEY_ALIAS="$(jq -r '.signing.key_alias' .factory/job.json)"
  FINGERPRINT="$(jq -r '.signing.fingerprint' .factory/job.json)"

  echo "::add-mask::$KEYSTORE_B64"
  echo "::add-mask::$STORE_PASS"
  echo "::add-mask::$KEY_PASS"
  printf '%s' "$KEYSTORE_B64" | base64 -d > .factory/android.keystore
fi

printf '%s' "$KEYSTORE_B64" > .factory/android.keystore.b64

export BUBBLEWRAP_KEYSTORE_PASSWORD="$STORE_PASS"
export BUBBLEWRAP_KEY_PASSWORD="$KEY_PASS"
export PACKAGE_ID
export KEY_ALIAS

jq -n   --arg establishmentId "$(jq -r '.establishment_id' .factory/job.json)"   --arg appName "$APP_NAME"   --arg artifactSlug "$ARTIFACT_SLUG"   --arg packageId "$PACKAGE_ID"   --arg host "$(jq -r '.host' .factory/job.json)"   --arg themeColor "$(jq -r '.theme_color' .factory/job.json)"   --arg backgroundColor "$(jq -r '.background_color' .factory/job.json)"   --arg logoUrl "$(jq -r '.logo_url' .factory/job.json)"   --arg channelName "$(jq -r '.channel_name' .factory/job.json)"   --arg channelDescription "$(jq -r '.channel_description' .factory/job.json)"   --arg firebaseConfigPath ".factory/google-services.json"   --arg keystoreB64Path ".factory/android.keystore.b64"   --arg keyAlias "$KEY_ALIAS"   --arg fingerprint "$FINGERPRINT"   --arg versionName "$VERSION_NAME"   --argjson versionCode "$VERSION_CODE"   '{
    establishmentId:$establishmentId,
    appName:$appName,
    artifactSlug:$artifactSlug,
    packageId:$packageId,
    host:$host,
    themeColor:$themeColor,
    backgroundColor:$backgroundColor,
    logoUrl:$logoUrl,
    channelName:$channelName,
    channelDescription:$channelDescription,
    firebaseConfigPath:$firebaseConfigPath,
    keystoreB64Path:$keystoreB64Path,
    keyAlias:$keyAlias,
    fingerprint:$fingerprint,
    versionName:$versionName,
    versionCode:$versionCode
  }' > .factory/config.json

SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SDKMANAGER" ]; then
  SDKMANAGER="$(find "$ANDROID_HOME/cmdline-tools" -type f -name sdkmanager | sort | tail -n 1)"
fi
test -x "$SDKMANAGER"
"$SDKMANAGER" "platform-tools" "platforms;android-35" "platforms;android-36" "build-tools;36.1.0"

BW_SDK="$HOME/.bubblewrap/android-sdk-wrapper"
mkdir -p "$BW_SDK/bin"
ln -sfn "$SDKMANAGER" "$BW_SDK/bin/sdkmanager"
for dir in build-tools platform-tools platforms licenses cmdline-tools; do
  if [ -e "$ANDROID_HOME/$dir" ]; then
    rm -rf "$BW_SDK/$dir"
    ln -s "$ANDROID_HOME/$dir" "$BW_SDK/$dir"
  fi
done
mkdir -p "$HOME/.bubblewrap"
printf '{"jdkPath":"%s","androidSdkPath":"%s"}\n' "$JAVA_HOME" "$BW_SDK" > "$HOME/.bubblewrap/config.json"

npm install -g @bubblewrap/cli
python3 scripts/generate_store_android.py .factory/config.json .native-build/store/generated

export ANDROID_SDK_ROOT="$BW_SDK"
cp .native-build/store/generated/twa-manifest.json .native-build/store/twa-manifest.json
cp .factory/android.keystore .native-build/store/android.keystore

LOGO_URL="$(jq -r '.logo_url' .factory/job.json)"
curl --fail --location --silent --show-error "$LOGO_URL" -o .native-build/store/logo.png

python3 - <<'PY'
import json
from pathlib import Path
p=Path('.native-build/store/twa-manifest.json')
data=json.loads(p.read_text())
local='http://127.0.0.1:8765/logo.png'
data['iconUrl']=local
data['maskableIconUrl']=local
data['monochromeIconUrl']=local
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
PY

python3 -m http.server 8765 --bind 127.0.0.1 --directory .native-build/store >/tmp/zaia-factory-logo.log 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1

pushd .native-build/store >/dev/null
bubblewrap update --skipVersionUpgrade --manifest=twa-manifest.json

cp "$GITHUB_WORKSPACE/.factory/google-services.json" app/google-services.json
JAVA_DIR="$(dirname "$(find app/src/main -type f -name LauncherActivity.java -print -quit)")"
test -n "$JAVA_DIR"
cp generated/LauncherActivity.java "$JAVA_DIR/LauncherActivity.java"
cp generated/ZaiaFirebaseMessagingService.java "$JAVA_DIR/ZaiaFirebaseMessagingService.java"
mkdir -p app/src/main/res/drawable
cp "$GITHUB_WORKSPACE/native/templates/android/ic_stat_zaia.xml" app/src/main/res/drawable/ic_stat_zaia.xml

python3 "$GITHUB_WORKSPACE/scripts/patch_store_android_project.py" "$PACKAGE_ID"
./gradlew :app:processReleaseGoogleServices :app:compileReleaseJavaWithJavac --no-daemon

bubblewrap build   --skipPwaValidation   --manifest=twa-manifest.json   --signingKeyPath=android.keystore   --signingKeyAlias="$KEY_ALIAS"

APK="$(find . -type f -name 'app-release-signed.apk' -print -quit)"
AAB="$(find . -type f -name 'app-release-bundle.aab' -print -quit)"
test -n "$APK"
test -n "$AAB"

mkdir -p "$GITHUB_WORKSPACE/.factory/release"
cp "$APK" "$GITHUB_WORKSPACE/.factory/release/$ARTIFACT_SLUG.apk"
cp "$AAB" "$GITHUB_WORKSPACE/.factory/release/$ARTIFACT_SLUG.aab"
popd >/dev/null

TAG="zaia-app-$PROFILE_ID-v$VERSION_CODE"
APK_NAME="$ARTIFACT_SLUG.apk"
AAB_NAME="$ARTIFACT_SLUG.aab"

if gh release view "$TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  gh release upload "$TAG"     ".factory/release/$APK_NAME"     ".factory/release/$AAB_NAME"     --clobber     --repo "$GITHUB_REPOSITORY"
else
  gh release create "$TAG"     ".factory/release/$APK_NAME"     ".factory/release/$AAB_NAME"     --repo "$GITHUB_REPOSITORY"     --target "$GITHUB_SHA"     --title "ZAIA App • $APP_NAME • $VERSION_NAME"     --notes "Pacote gerado automaticamente pelo ZAIA App Factory."     --prerelease
fi

APK_URL="https://github.com/$GITHUB_REPOSITORY/releases/download/$TAG/$APK_NAME"
AAB_URL="https://github.com/$GITHUB_REPOSITORY/releases/download/$TAG/$AAB_NAME"

jq -n   --arg mode "complete"   --arg profile_id "$PROFILE_ID"   --arg apk_url "$APK_URL"   --arg aab_url "$AAB_URL"   --arg release_tag "$TAG"   '{mode:$mode,profile_id:$profile_id,apk_url:$apk_url,aab_url:$aab_url,release_tag:$release_tag}'   > .factory/complete.json

factory_post .factory/complete.json > .factory/complete-response.json
trap - ERR
echo "ZAIA App Factory: aplicativo concluído para $APP_NAME ($PACKAGE_ID)."
