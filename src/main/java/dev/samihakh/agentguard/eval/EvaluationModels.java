package dev.samihakh.agentguard.eval;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class EvaluationModels {
    private EvaluationModels() {}

    public record EvaluationRequest(
        @NotBlank @Size(max = 200) String taskTitle,
        @NotBlank @Size(max = 4000) String acceptanceCriteria,
        @NotBlank @Size(max = 20000) String diffText,
        boolean testsPassed
    ) {}

    public record PrEvaluationRequest(@NotBlank @Size(max = 500) String prUrl) {}

    public record Finding(String rule, Severity severity, String message) {}
    public enum Severity { INFO, WARNING, BLOCKER }

    public record EvaluationResponse(
        Long id, int score, String verdict, List<Finding> findings, Instant createdAt
    ) {}

    public record RunSummary(Long id, String taskTitle, int score, String verdict, Instant createdAt) {}
}

