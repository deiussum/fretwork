{
  lib,
  buildNpmPackage,
  importNpmLock,
  nodejs_22,
  src,
  commit ? "",
}:

let
  packageJson = lib.importJSON (src + "/package.json");
in
buildNpmPackage {
  pname = "fretwork";
  inherit (packageJson) version;
  inherit src;
  nodejs = nodejs_22;

  # Dependencies straight from package-lock.json, so there is no hash to update.
  npmDeps = importNpmLock { npmRoot = src; };
  npmConfigHook = importNpmLock.npmConfigHook;

  env.FRETWORK_COMMIT = commit;

  postBuild = ''
    node_modules/.bin/tsx scripts/nginx-headers.ts > nginx-headers.conf
  '';

  installPhase = ''
    runHook preInstall
    mkdir -p $out/share/fretwork
    cp -r dist $out/share/fretwork/www
    cp nginx-headers.conf $out/share/fretwork/nginx-headers.conf
    runHook postInstall
  '';

  meta = {
    description = "Browser-based guitar practice tools";
    homepage = "https://github.com/deiussum/fretwork";
    license = lib.licenses.mit;
    platforms = lib.platforms.all;
  };
}
