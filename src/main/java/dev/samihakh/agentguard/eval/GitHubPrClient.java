package dev.samihakh.agentguard.eval;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fetches a public GitHub pull request's diff and test status. Only ever talks to api.github.com,
 * built from the owner/repo/number this class parses out of the URL itself, so a caller-supplied
 * URL can never redirect this service to fetch from somewhere else.
 */
@Component
public class GitHubPrClient {
    private static final Pattern PR_URL = Pattern.compile(
        "^https://github\\.com/([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+)/pull/(\\d+)(?:[/?#].*)?$"
    );

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GitHubPrClient(RestClient.Builder builder, ObjectMapper objectMapper,
                           @Value("${agentguard.github-token:}") String githubToken) {
        RestClient.Builder configured = builder
            .baseUrl("https://api.github.com")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28");
        if (githubToken != null && !githubToken.isBlank()) {
            configured = configured.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + githubToken);
        }
        this.restClient = configured.build();
        this.objectMapper = objectMapper;
    }

    public PullRequestDetails fetch(String prUrl) {
        Matcher match = PR_URL.matcher(prUrl == null ? "" : prUrl.strip());
        if (!match.matches()) {
            throw new InvalidPrUrlException(prUrl);
        }
        String owner = match.group(1);
        String repo = match.group(2);
        String number = match.group(3);
        String path = "/repos/" + owner + "/" + repo + "/pulls/" + number;

        PrPayload pr = getJson(path, prUrl, PrPayload.class);
        String diff = getRaw(path, prUrl, "application/vnd.github.v3.diff");
        boolean testsPassed = false;
        if (pr.head() != null && pr.head().sha() != null) {
            StatusPayload status = getJson(
                "/repos/" + owner + "/" + repo + "/commits/" + pr.head().sha() + "/status", prUrl, StatusPayload.class
            );
            testsPassed = "success".equals(status.state());
        }
        return new PullRequestDetails(pr.title(), pr.body(), diff, testsPassed);
    }

    private <T> T getJson(String path, String prUrl, Class<T> type) {
        String body = getRaw(path, prUrl, "application/vnd.github+json");
        try {
            return objectMapper.readValue(body, type);
        } catch (JsonProcessingException exception) {
            throw new GitHubUnavailableException("GitHub returned a response AgentGuard could not read", exception);
        }
    }

    private String getRaw(String path, String prUrl, String accept) {
        try {
            return restClient.get().uri(path).header(HttpHeaders.ACCEPT, accept).retrieve().body(String.class);
        } catch (HttpClientErrorException.NotFound notFound) {
            throw new PrNotFoundException(prUrl);
        } catch (RestClientException failure) {
            throw new GitHubUnavailableException("Could not reach GitHub to evaluate " + prUrl, failure);
        }
    }

    public record PullRequestDetails(String title, String body, String diffText, boolean testsPassed) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record PrPayload(String title, String body, Head head) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record Head(String sha) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record StatusPayload(String state) {}
}
