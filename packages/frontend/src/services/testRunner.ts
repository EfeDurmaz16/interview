import {runPhp} from "./phpWasm";

export type TestCase ={
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
} 

export type TestResult = {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  executionTimeMs: number;
  exitCode: number;
  stderr?: string;
};

export async function runTestCases(code: string, testCases: TestCase[]): Promise<TestResult[]> {
  const results: TestResult[] = [];
    for (const testCase of testCases) {
        const startTime = performance.now();
        const result = await runPhp(code, testCase.input);
        const endTime = performance.now();
        
        const passed = result.stdout.trim() === testCase.expectedOutput.trim() && result.exitCode === 0;
        results.push({
            passed,
            input: testCase.input,
            expected: testCase.expectedOutput,
            actual: result.stdout,
            executionTimeMs: endTime - startTime,
            exitCode: result.exitCode,
            stderr: result.stderr,
        });
    }
    return results;
}

export async function getTestSummary(results: TestResult[]): Promise<string> {
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    return `Passed ${passedCount} out of ${totalCount} test cases.`;
}