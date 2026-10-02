/**
 * The record name for a subdomain inside a hosted zone, e.g. 'agentrite' for 'agentrite.ritenoar.com' in
 * 'ritenoar.com'. Refuses a subdomain outside the zone, which would otherwise yield a record name for the wrong host.
 */
export function recordNameFor(subdomain: string, hostedZoneDomain: string): string {
  if (!subdomain.endsWith(`.${hostedZoneDomain}`)) {
    throw new Error(`subdomain ${subdomain} is not inside zone ${hostedZoneDomain}`);
  }
  return subdomain.slice(0, -(hostedZoneDomain.length + 1));
}
