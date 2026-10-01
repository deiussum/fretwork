{
  description = "Fretwork: browser-based guitar practice tools";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
      # Shown in the app's footer; flake builds have no .git to ask.
      commit = self.shortRev or self.dirtyShortRev or "";
    in
    {
      packages = forAllSystems (pkgs: rec {
        fretwork = pkgs.callPackage ./nix/package.nix {
          src = self;
          inherit commit;
        };
        default = fretwork;
      });

      nixosModules.default = import ./nix/module.nix self;

      checks = forAllSystems (pkgs: {
        package = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
        module = pkgs.testers.runNixOSTest (import ./nix/test.nix self);
      });

      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_22
            pkgs.openspec
          ];
        };
      });
    };
}
