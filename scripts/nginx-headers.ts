// Print the security headers as an nginx snippet for the container and the
// NixOS module to include:
//
//   npx tsx scripts/nginx-headers.ts > nginx-headers.conf
import { nginxHeaderSnippet } from '../src/csp'

process.stdout.write(nginxHeaderSnippet())
