// The reason of a test that the host skips because it lacks what the test needs. It also says where the whole suite
// runs, which is the sandbox, so that whoever reads the reason knows what to do about it.
export function skipReason(lacks) {
  return `${lacks}. The whole suite runs in the sandbox: ./sandbox.sh --in-place npm test`;
}
