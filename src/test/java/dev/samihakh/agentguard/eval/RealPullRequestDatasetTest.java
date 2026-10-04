package dev.samihakh.agentguard.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.samihakh.agentguard.eval.EvaluationModels.Finding;
import dev.samihakh.agentguard.eval.EvaluationModels.Severity;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the engine against real, currently-merged pull requests in well-known public
 * repositories (expressjs/express, pallets/flask), fetched live from GitHub, instead
 * of the hand-written synthetic diffs in GuardrailEngineDatasetTest. Labels in
 * real-prs.json were derived by hand from each PR's actual changed files against the
 * engine's own documented, deterministic rules (not guessed): a protected-path label
 * of true means a real file under .github/workflows/ was changed; change-size true
 * means the PR's real GitHub-reported addition count exceeds 300; test-evidence true
 * means none of the real changed paths match the test-file pattern.
 *
 * secret-scan is intentionally excluded: finding a real merged PR that trips this
 * regex would mean searching for an actual leaked credential in a stranger's
 * repository, which this project won't do even if the key was later revoked.
 * test-gate is also excluded: GitHub's combined commit status for an old PR can
 * change or expire independently of what the code looked like at merge time, which
 * would make this dataset non-reproducible through no fault of the engine.
 * Both rules already have full coverage in the synthetic dataset.
 *
 * Opt-in only (not part of the default `mvn verify` / CI run): depends on live
 * network access to api.github.com and GitHub's unauthenticated rate limit (60/hr),
 * or a GITHUB_TOKEN for a higher one. Run with:
 *   GITHUB_TOKEN=$(gh auth token) AGENTGUARD_RUN_REAL_PR_BENCHMARK=true mvn test -Dtest=RealPullRequestDatasetTest
 */
@EnabledIfEnvironmentVariable(named = "AGENTGUARD_RUN_REAL_PR_BENCHMARK", matches = "true")
class RealPullRequestDatasetTest {
    private final GuardrailEngine engine = new GuardrailEngine();
    private final GitHubPrClient client = new GitHubPrClient(
        RestClient.builder(), new ObjectMapper(), System.getenv().getOrDefault("GITHUB_TOKEN", ""));

    static Stream<Arguments> cases() throws IOException {
        ObjectMapper mapper = new ObjectMapper();
        List<Arguments> arguments = new ArrayList<>();
        try (InputStream in = RealPullRequestDatasetTest.class.getResourceAsStream("/datasets/real-prs.json")) {
            assertThat(in).as("real-prs.json dataset file").isNotNull();
            RealPrCase[] cases = mapper.readValue(in, RealPrCase[].class);
            for (RealPrCase testCase : cases) {
                for (Map.Entry<String, Boolean> expectation : testCase.expected().entrySet()) {
                    arguments.add(Arguments.of(testCase, expectation.getKey(), expectation.getValue()));
                }
            }
        }
        return arguments.stream();
    }

    @ParameterizedTest(name = "[{1}] {0} -> expect flagged={2}")
    @MethodSource("cases")
    void engineAgreesWithTheRealOutcome(RealPrCase testCase, String rule, boolean shouldFlag) {
        GitHubPrClient.PullRequestDetails pr = client.fetch(testCase.prUrl());
        List<Finding> findings = engine.inspect(pr.diffText(), pr.testsPassed());
        boolean flagged = findings.stream()
            .anyMatch(f -> f.rule().equals(rule) && f.severity() != Severity.INFO);
        assertThat(flagged)
            .as("%s (%s): rule=%s", testCase.prUrl(), testCase.description(), rule)
            .isEqualTo(shouldFlag);
    }

    record RealPrCase(String prUrl, String description, Map<String, Boolean> expected) {
        @Override
        public String toString() {
            return prUrl();
        }
    }
}
