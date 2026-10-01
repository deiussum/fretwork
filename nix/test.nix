self: {
  name = "fretwork";

  nodes.machine = {
    imports = [ self.nixosModules.default ];
    services.fretwork = {
      enable = true;
      hostName = "fretwork.test";
      logRetention = ''up to "7" days'';
      operatorContact = "mailto:admin@example.com";
    };
    networking.hosts."127.0.0.1" = [ "fretwork.test" ];
  };

  # Same, with access logging turned on, to show the default really is off.
  nodes.logging = {
    imports = [ self.nixosModules.default ];
    services.fretwork = {
      enable = true;
      hostName = "fretwork.test";
      accessLog = true;
    };
    networking.hosts."127.0.0.1" = [ "fretwork.test" ];
  };

  testScript = ''
    import json

    start_all()
    machine.wait_for_unit("nginx.service")
    machine.wait_for_open_port(80)

    def headers(path):
        return machine.succeed(f"curl -sfI http://fretwork.test{path}").lower()

    with subtest("index is served with security headers and no caching"):
        page = machine.succeed("curl -sf http://fretwork.test/")
        assert "<title>Fretwork</title>" in page, page
        h = headers("/")
        assert "frame-ancestors 'none'" in h, h
        assert "permissions-policy: microphone=(self)" in h, h
        assert "x-content-type-options: nosniff" in h, h
        assert "referrer-policy: no-referrer" in h, h
        assert "cache-control: no-cache" in h, h

    with subtest("hashed assets are immutable and keep the headers"):
        asset = machine.succeed(
            "curl -sf http://fretwork.test/ | grep -o '/assets/index-[A-Za-z0-9_-]*\\.js' | head -n1"
        ).strip()
        h = headers(asset)
        assert "immutable" in h, h
        assert "frame-ancestors 'none'" in h, h

    with subtest("config.json states the operator details"):
        config = json.loads(machine.succeed("curl -sf http://fretwork.test/config.json"))
        assert config == {
            "logRetention": 'up to "7" days',
            "operatorContact": "mailto:admin@example.com",
        }, config
        h = headers("/config.json")
        assert "application/json" in h, h
        assert "cache-control: no-cache" in h, h

    with subtest("the manifest is served as a web app manifest"):
        h = headers("/manifest.webmanifest")
        assert "content-type: application/manifest+json" in h, h
        assert "frame-ancestors 'none'" in h, h

    with subtest("no access log entries by default"):
        machine.succeed("test ! -s /var/log/nginx/access.log")

    with subtest("access log entries when turned on, and config.json empty when nothing is set"):
        logging.wait_for_unit("nginx.service")
        logging.wait_for_open_port(80)
        assert json.loads(logging.succeed("curl -sf http://fretwork.test/config.json")) == {}
        logging.succeed("grep -q 'GET /config.json' /var/log/nginx/access.log")
  '';
}
