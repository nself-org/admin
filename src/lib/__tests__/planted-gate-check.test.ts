// Planted failure for D-0100: proves the Unit Tests job fails on a red test.
// Lives only on a throwaway PR; never merge.
test('planted failure must fail the gate', () => {
  expect(1).toBe(2)
})
