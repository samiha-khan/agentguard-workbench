package dev.samihakh.agentguard.eval;

import dev.samihakh.agentguard.eval.EvaluationModels.Finding;
import dev.samihakh.agentguard.eval.EvaluationModels.Severity;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class GuardrailEngineTest {
    private final GuardrailEngine engine = new GuardrailEngine();

    private static boolean has(List<Finding> findings, String rule, Severity severity) {
        return findings.stream().anyMatch(f -> f.rule().equals(rule) && f.severity() == severity);
    }

    private static boolean has(List<Finding> findings, String rule) {
        return findings.stream().anyMatch(f -> f.rule().equals(rule));
    }

    @Test
    void blocksHardCodedSecrets() {
        var findings = engine.inspect("+api_key = \"123456789-secret\"\n+new feature", true);
        assertThat(has(findings, "secret-scan", Severity.BLOCKER)).isTrue();
    }

    @Test
    void ignoresSecretsThatTheDiffRemoves() {
        var diff = "--- a/App.java\n+++ b/App.java\n-api_key = \"123456789-secret\"\n+return ok;";
        assertThat(has(engine.inspect(diff, true), "secret-scan")).isFalse();
    }

    @Test
    void ignoresShortValuesThatAreNotCredentials() {
        assertThat(has(engine.inspect("+token = \"abc\"", true), "secret-scan")).isFalse();
    }

    @Test
    void blocksChangesToProtectedPaths() {
        var diff = "--- a/.github/workflows/ci.yml\n+++ b/.github/workflows/ci.yml\n+run: echo hi";
        assertThat(has(engine.inspect(diff, true), "protected-path", Severity.BLOCKER)).isTrue();
    }

    @Test
    void blocksDeletingAProtectedFile() {
        var diff = "--- a/db/migrations/V1__init.sql\n+++ /dev/null\n-create table runs (id bigint);";
        assertThat(has(engine.inspect(diff, true), "protected-path", Severity.BLOCKER)).isTrue();
    }

    @Test
    void allowsOrdinaryPaths() {
        var diff = "--- a/src/App.java\n+++ b/src/App.java\n+return ok;";
        assertThat(has(engine.inspect(diff, true), "protected-path")).isFalse();
    }

    @Test
    void blocksFailedTests() {
        var findings = engine.inspect("+public void feature() {}", false);
        assertThat(has(findings, "test-gate", Severity.BLOCKER)).isTrue();
    }

    @Test
    void passingTestsAreReportedAsInfoOnly() {
        var findings = engine.inspect("+public void feature() {}", true);
        assertThat(has(findings, "test-gate", Severity.INFO)).isTrue();
        assertThat(has(findings, "test-gate", Severity.BLOCKER)).isFalse();
    }

    @Test
    void warnsAboveThreeHundredAddedLines() {
        assertThat(has(engine.inspect(addedLines(301), true), "change-size", Severity.WARNING)).isTrue();
    }

    @Test
    void doesNotWarnAtThreeHundredAddedLines() {
        assertThat(has(engine.inspect(addedLines(300), true), "change-size")).isFalse();
    }

    @Test
    void fileHeadersAreNotCountedAsAddedLines() {
        var diff = addedLines(299) + "\n--- a/B.java\n+++ b/B.java";
        assertThat(has(engine.inspect(diff, true), "change-size")).isFalse();
    }

    @Test
    void warnsWhenNoTestFileIsChanged() {
        var diff = "--- a/src/UserService.java\n+++ b/src/UserService.java\n+return user;";
        assertThat(has(engine.inspect(diff, true), "test-evidence", Severity.WARNING)).isTrue();
    }

    @Test
    void theWordTestInsideCodeIsNotTestEvidence() {
        var diff = "+++ b/src/Version.java\n+String latest = \"1.2\";";
        assertThat(has(engine.inspect(diff, true), "test-evidence", Severity.WARNING)).isTrue();
    }

    @Test
    void recognizesCommonTestFileNames() {
        for (var path : List.of("src/UserServiceTest.java", "web/Card.test.tsx", "web/Card.spec.ts",
                "src/test/java/Helper.java", "web/__tests__/card.js", "app/test_cards.py")) {
            var diff = "+++ b/" + path + "\n+x";
            assertThat(has(engine.inspect(diff, true), "test-evidence"))
                .as(path).isFalse();
        }
    }

    @Test
    void cleanTestedDiffHasNoBlockersOrWarnings() {
        var diff = "+++ b/src/UserService.java\n+return user;\n+++ b/src/UserServiceTest.java\n+assertThat(user);";
        var findings = engine.inspect(diff, true);
        assertThat(findings).noneMatch(f -> f.severity() == Severity.BLOCKER || f.severity() == Severity.WARNING);
    }

    private static String addedLines(int count) {
        return IntStream.range(0, count).mapToObj(i -> "+int v" + i + " = " + i + ";")
            .collect(Collectors.joining("\n"));
    }
}
