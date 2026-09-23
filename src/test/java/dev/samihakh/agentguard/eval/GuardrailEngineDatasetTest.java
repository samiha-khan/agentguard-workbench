package dev.samihakh.agentguard.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.samihakh.agentguard.eval.EvaluationModels.Finding;
import dev.samihakh.agentguard.eval.EvaluationModels.Severity;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the engine against the labeled example diffs in src/test/resources/datasets/,
 * one JSON file per rule. Each case asserts the engine's flag/no-flag verdict for its
 * own rule matches the label; it does not check other rules' findings on the same diff.
 */
class GuardrailEngineDatasetTest {
    private static final List<String> RULES = List.of(
        "secret-scan", "protected-path", "change-size", "test-evidence", "test-gate"
    );

    private final GuardrailEngine engine = new GuardrailEngine();

    static Stream<Arguments> cases() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        List<Arguments> arguments = new ArrayList<>();
        for (String rule : RULES) {
            try (InputStream in = GuardrailEngineDatasetTest.class.getResourceAsStream(
                    "/datasets/" + rule + ".json")) {
                assertThat(in).as("dataset file for rule " + rule).isNotNull();
                DatasetCase[] cases = mapper.readValue(in, DatasetCase[].class);
                for (DatasetCase testCase : cases) {
                    arguments.add(Arguments.of(rule, testCase));
                }
            }
        }
        return arguments.stream();
    }

    @ParameterizedTest(name = "[{0}] {1}")
    @MethodSource("cases")
    void engineAgreesWithTheLabel(String rule, DatasetCase testCase) {
        List<Finding> findings = engine.inspect(testCase.diff(), testCase.testsPassed());
        boolean flagged = findings.stream()
            .anyMatch(f -> f.rule().equals(rule) && f.severity() != Severity.INFO);
        assertThat(flagged)
            .as("%s: %s (why: %s)", testCase.name(), rule, testCase.why())
            .isEqualTo(testCase.shouldFlag());
    }

    record DatasetCase(String name, String diff, boolean testsPassed, boolean shouldFlag, String why) {
        @Override
        public String toString() {
            return name;
        }
    }
}
