self:
{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.fretwork;

  # Operator details for the app's privacy page; unset options are left out.
  configJson = pkgs.writeText "fretwork-config.json" (
    builtins.toJSON (
      lib.filterAttrs (_: value: value != null) {
        inherit (cfg) logRetention operatorContact;
      }
    )
  );

  # Every location includes the security headers: nginx drops inherited
  # add_header lines in a location that adds its own.
  headers = "include ${cfg.package}/share/fretwork/nginx-headers.conf;\n";
  noCache = ''add_header Cache-Control "no-cache" always;'' + "\n";
in
{
  options.services.fretwork = {
    enable = lib.mkEnableOption "Fretwork, served by the system nginx";

    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      defaultText = lib.literalExpression "fretwork.packages.\${system}.default";
      description = "The Fretwork package to serve.";
    };

    hostName = lib.mkOption {
      type = lib.types.str;
      example = "fretwork.example.com";
      description = ''
        Name of the nginx virtual host. Add TLS settings (for example
        `forceSSL` and `enableACME`) to `services.nginx.virtualHosts.<hostName>`
        yourself, or terminate TLS in a proxy in front: browsers only allow the
        microphone on secure pages.
      '';
    };

    logRetention = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "up to 7 days";
      description = ''
        How long the servers in front of this instance keep access logs,
        shown on the privacy page. When null, the page says it is not stated.
      '';
    };

    operatorContact = lib.mkOption {
      type = lib.types.nullOr lib.types.str;
      default = null;
      example = "mailto:admin@example.com";
      description = ''
        How visitors can contact you, shown on the privacy page. `https://` and
        `mailto:` values become links; anything else is shown as text.
      '';
    };

    accessLog = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether nginx keeps access logs for this virtual host.";
    };
  };

  config = lib.mkIf cfg.enable {
    services.nginx = {
      enable = true;
      virtualHosts.${cfg.hostName} = {
        root = "${cfg.package}/share/fretwork/www";
        extraConfig = lib.optionalString (!cfg.accessLog) "access_log off;";

        locations."/" = {
          tryFiles = "$uri $uri/ =404";
          extraConfig = headers;
        };

        # Content-hashed files never change.
        locations."/assets/" = {
          tryFiles = "$uri =404";
          extraConfig = headers + ''add_header Cache-Control "public, max-age=31536000, immutable" always;'';
        };

        # Always revalidate, so a new deployment is picked up on the next visit.
        locations."= /index.html".extraConfig = headers + noCache;

        # The web app manifest, with its type set explicitly rather than
        # relying on the MIME table.
        locations."= /manifest.webmanifest".extraConfig = headers + ''
          types { }
          default_type application/manifest+json;
        '';

        locations."= /config.json" = {
          alias = configJson;
          extraConfig = headers + noCache + "default_type application/json;";
        };
      };
    };
  };
}
