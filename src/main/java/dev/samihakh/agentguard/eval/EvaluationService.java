package dev.samihakh.agentguard.eval;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.samihakh.agentguard.eval.EvaluationModels.*;
import dev.samihakh.agentguard.run.AgentRun;
import dev.samihakh.agentguard.run.AgentRunRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvaluationService {
    private final GuardrailEngine guardrails;
    private final AgentRunRepository repository;
    private final ObjectMapper objectMapper;

    public EvaluationService(GuardrailEngine guardrails, AgentRunRepository repository, ObjectMapper objectMapper) {
        this.guardrails = guardrails;
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public EvaluationResponse evaluate(EvaluationRequest request) {
        List<Finding> findings = guardrails.inspect(request.diffText(), request.testsPassed());
        int blockers = count(findings, Severity.BLOCKER);
        int warnings = count(findings, Severity.WARNING);
        int score = Math.max(0, 100 - blockers * 40 - warnings * 10);
        String verdict = blockers > 0 ? "BLOCKED" : warnings > 0 ? "REVIEW" : "PASS";
        try {
            AgentRun saved = repository.save(new AgentRun(
                request.taskTitle(), request.acceptanceCriteria(), request.diffText(),
                score, verdict, objectMapper.writeValueAsString(findings)
            ));
            return new EvaluationResponse(saved.getId(), score, verdict, findings, saved.getCreatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not serialize findings", exception);
        }
    }

    public List<RunSummary> history() {
        return repository.findAll(Sort.by(Sort.Direction.DESC, "createdAt")).stream()
            .map(run -> new RunSummary(run.getId(), run.getTaskTitle(), run.getScore(), run.getVerdict(), run.getCreatedAt()))
            .toList();
    }

    public EvaluationResponse get(Long id) {
        AgentRun run = repository.findById(id).orElseThrow(() -> new RunNotFoundException(id));
        try {
            List<Finding> findings = objectMapper.readValue(run.getFindingsJson(), new TypeReference<>() {});
            return new EvaluationResponse(run.getId(), run.getScore(), run.getVerdict(), findings, run.getCreatedAt());
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Could not read findings", exception);
        }
    }

    private int count(List<Finding> findings, Severity severity) {
        return (int) findings.stream().filter(finding -> finding.severity() == severity).count();
    }
}

