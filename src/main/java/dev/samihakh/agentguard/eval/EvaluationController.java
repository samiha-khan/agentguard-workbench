package dev.samihakh.agentguard.eval;

import dev.samihakh.agentguard.eval.EvaluationModels.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {
    private final EvaluationService service;

    public EvaluationController(EvaluationService service) { this.service = service; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public EvaluationResponse evaluate(@Valid @RequestBody EvaluationRequest request) {
        return service.evaluate(request);
    }

    @PostMapping("/from-pr") @ResponseStatus(HttpStatus.CREATED)
    public EvaluationResponse evaluateFromPr(@Valid @RequestBody PrEvaluationRequest request) {
        return service.evaluateFromPr(request.prUrl());
    }

    @GetMapping
    public List<RunSummary> history() { return service.history(); }

    @GetMapping("/{id}")
    public EvaluationResponse get(@PathVariable Long id) { return service.get(id); }

    @ExceptionHandler(RunNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> notFound(RunNotFoundException exception) {
        return Map.of("error", exception.getMessage());
    }

    @ExceptionHandler(InvalidPrUrlException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidPrUrl(InvalidPrUrlException exception) {
        return Map.of("error", exception.getMessage());
    }

    @ExceptionHandler(PrNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> prNotFound(PrNotFoundException exception) {
        return Map.of("error", exception.getMessage());
    }

    @ExceptionHandler(GitHubUnavailableException.class)
    @ResponseStatus(HttpStatus.BAD_GATEWAY)
    public Map<String, String> gitHubUnavailable(GitHubUnavailableException exception) {
        return Map.of("error", exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> invalidRequest(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
            .map(error -> error.getField() + " " + error.getDefaultMessage())
            .collect(Collectors.joining("; "));
        return Map.of("error", message.isBlank() ? "The request was invalid." : message);
    }
}

