# Fretwork

Browser-based guitar practice tools, driven from the keyboard so your hands can stay on the guitar.

## Tools

- **1 minute changes:** pick two chords, get an audible count-in, alternate between the chords for 60 seconds, then log how many changes you made. Scores are tracked per chord pair. In Mic mode, your strums are counted automatically from a microphone or audio interface.
- **Metronome:** a steady click from 30 to 300 BPM, with an accented first beat, tap tempo and a large beat display. Its speed trainer raises the tempo by a set step every few bars until it reaches a target, and it keeps time in a background tab.

## Privacy

Fretwork runs entirely in your browser. There are no accounts and no server-side storage. The microphone is used only in Mic mode, and its audio never leaves the browser. Results and settings are saved in your browser only. The published build blocks connections to any other site with a Content-Security-Policy. The full statement is on the app's Privacy page, linked from the footer.

## Self-hosting

Fretwork is a static web app, so you can run your own copy. Serve it over **HTTPS**: browsers only allow the microphone on secure pages. Both options below serve plain HTTP and expect TLS to be handled in front of them, for example by a reverse proxy or nginx's own TLS settings.

On your instance's privacy page, Fretwork shows two things you state about your hosting: how long access logs are kept, and optionally how to contact you. Neither the container nor the NixOS module keeps access logs by default. So the retention to state is the longest of whatever sits in front, such as your proxy.

### Container

Images for amd64 and arm64 are published to `ghcr.io/deiussum/fretwork`. Tags are `latest`, `<major>.<minor>` and `<version>`.

```sh
docker run -d --name fretwork -p 8080:8080 \
  -e FRETWORK_LOG_RETENTION="up to 7 days" \
  -e FRETWORK_OPERATOR_CONTACT="mailto:you@example.com" \
  ghcr.io/deiussum/fretwork:latest
```

| Variable | Meaning |
|---|---|
| `FRETWORK_LOG_RETENTION` | How long access logs are kept, shown on the privacy page. If unset, the page says it isn't stated. |
| `FRETWORK_OPERATOR_CONTACT` | Optional contact. `https://` and `mailto:` values become links. |
| `FRETWORK_ACCESS_LOG` | Set to `on` to write access logs to the container's output. Off by default. |

The container runs as a non-root user on port 8080. It only writes to `/tmp`, so it also runs with a read-only root filesystem (`--read-only --tmpfs /tmp`). It works the same with Podman.

### NixOS

The flake provides a NixOS module that serves Fretwork through the system nginx:

```nix
{
  inputs.fretwork.url = "github:deiussum/fretwork";

  outputs = { nixpkgs, fretwork, ... }: {
    nixosConfigurations.myhost = nixpkgs.lib.nixosSystem {
      modules = [
        fretwork.nixosModules.default
        {
          services.fretwork = {
            enable = true;
            hostName = "fretwork.example.com";
            logRetention = "up to 7 days";
            operatorContact = "mailto:you@example.com"; # optional
            # accessLog = true;                         # off by default
          };
          # Add TLS on the same virtual host, or terminate it in a proxy:
          # services.nginx.virtualHosts."fretwork.example.com" = { forceSSL = true; enableACME = true; };
        }
      ];
    };
  };
}
```

To update, run `nix flake update fretwork`. To pin a release, use `github:deiussum/fretwork/v0.2.0`. To build the static files alone, run `nix build github:deiussum/fretwork`; the site is in `result/share/fretwork/www`.

## Development

```sh
npm install
npm run dev     # start the dev server
npm test        # run unit and UI tests
npm run lint    # lint
npm run build   # type-check and build
```

With Nix, `nix develop` gives you a shell with Node.js and the OpenSpec CLI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how work is planned, built and reviewed.

## License

[MIT](LICENSE)
