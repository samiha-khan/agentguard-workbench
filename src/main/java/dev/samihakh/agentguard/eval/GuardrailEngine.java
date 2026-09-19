package dev.samihakh.agentguard.eval;

import dev.samihakh.agentguard.eval.EvaluationModels.Finding;
import dev.samihakh.agentguard.eval.EvaluationModels.Severity;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class GuardrailEngine {
    private static final int MAX_ADDED_LINES = 300;

    private static final Pattern SECRET = Pattern.compile(
        "(?i)(api[_-]?key|password|secret|token)\\s*[=:]\\s*[\\\"'][^\\\"']{8,}[\\\"']"
    );
    private static final List<String> PROTECTED_PREFIXES = List.of(
        ".github/workflows/", "infra/production/", "db/migrations/"
    );
    private static final Pattern TEST_FILE = Pattern.compile(
        "(^|/)(test|tests|__tests__)/|(Test|Tests|IT)\\.java$|\\.(test|spec)\\.[jt]sx?$|(^|/)test_[^/]*\\.py$|_test\\.(go|py)$"
    );

    public List<Finding> inspect(String diff, boolean testsPassed) {
        List<String> addedLines = new ArrayList<>();
        Set<String> changedPaths = new LinkedHashSet<>();
        for (String line : diff.lines().toList()) {
            if (line.startsWith("+++ ") || line.startsWith("--- ")) {
                pathFromHeader(line).ifPresent(changedPaths::add);
            } else if (line.startsWith("+")) {
                addedLines.add(line.substring(1));
            }
        }

        List<Finding> findings = new ArrayList<>();
        if (addedLines.stream().anyMatch(line -> SECRET.matcher(line).find())) {
            findings.add(new Finding("secret-scan", Severity.BLOCKER,
                "Possible hard-coded credential found in added code."));
        }
        if (changedPaths.stream().anyMatch(GuardrailEngine::isProtected)) {
            findings.add(new Finding("protected-path", Severity.BLOCKER,
                "The change touches a protected production path and requires human approval."));
        }
        if (addedLines.size() > MAX_ADDED_LINES) {
            findings.add(new Finding("change-size", Severity.WARNING,
                "Large change detected; split it into smaller reviewable units."));
        }
        if (testsPassed) {
            findings.add(new Finding("test-gate", Severity.INFO, "The submitted test suite passed."));
        } else {
            findings.add(new Finding("test-gate", Severity.BLOCKER, "The submitted test suite did not pass."));
        }
        if (changedPaths.stream().noneMatch(path -> TEST_FILE.matcher(path).find())) {
            findings.add(new Finding("test-evidence", Severity.WARNING,
                "No test file appears in the diff; confirm existing tests cover the behavior."));
        }
        return findings;
    }

    /** Returns the file path from a "--- a/x" or "+++ b/x" header, or empty for /dev/null. */
    private static Optional<String> pathFromHeader(String header) {
        String path = header.substring(4).strip();
        if (path.equals("/dev/null")) {
            return Optional.empty();
        }
        if (path.startsWith("a/") || path.startsWith("b/")) {
            path = path.substring(2);
        }
        return Optional.of(path);
    }

    private static boolean isProtected(String path) {
        return PROTECTED_PREFIXES.stream().anyMatch(path::startsWith);
    }
}
