package dev.samihakh.agentguard.eval;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GitHubPrClientTest {
    private static final String PR_URL = "https://github.com/acme/widgets/pull/42";

    private RestClient.Builder builder;
    private MockRestServiceServer server;
    private GitHubPrClient client;

    private void setUp(String token) {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        client = new GitHubPrClient(builder, new ObjectMapper(), token);
    }

    @Test
    void fetchesTheDiffTitleBodyAndPassingStatus() {
        setUp("");
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andExpect(header("Accept", "application/vnd.github+json"))
            .andRespond(withSuccess(
                """
                {"title":"Add progress card","body":"Shows completion percent.","head":{"sha":"abc123"}}
                """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andExpect(header("Accept", "application/vnd.github.v3.diff"))
            .andRespond(withSuccess("--- a/x\n+++ b/x\n+ok", MediaType.TEXT_PLAIN));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/commits/abc123/status"))
            .andRespond(withSuccess("""
                {"state":"success"}
                """, MediaType.APPLICATION_JSON));

        var details = client.fetch(PR_URL);

        assertThat(details.title()).isEqualTo("Add progress card");
        assertThat(details.body()).isEqualTo("Shows completion percent.");
        assertThat(details.diffText()).contains("+ok");
        assertThat(details.testsPassed()).isTrue();
    }

    @Test
    void aFailingCheckIsReportedAsTestsNotPassed() {
        setUp("");
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andExpect(header("Accept", "application/vnd.github+json"))
            .andRespond(withSuccess("""
                {"title":"t","body":"b","head":{"sha":"abc123"}}
                """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andExpect(header("Accept", "application/vnd.github.v3.diff"))
            .andRespond(withSuccess("+x", MediaType.TEXT_PLAIN));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/commits/abc123/status"))
            .andRespond(withSuccess("""
                {"state":"failure"}
                """, MediaType.APPLICATION_JSON));

        assertThat(client.fetch(PR_URL).testsPassed()).isFalse();
    }

    @Test
    void sendsTheGitHubTokenWhenConfigured() {
        setUp("secret-token");
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andExpect(header("Authorization", "Bearer secret-token"))
            .andRespond(withSuccess("""
                {"title":"t","body":"b","head":{"sha":"abc123"}}
                """, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andRespond(withSuccess("+x", MediaType.TEXT_PLAIN));
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/commits/abc123/status"))
            .andRespond(withSuccess("""
                {"state":"success"}
                """, MediaType.APPLICATION_JSON));

        client.fetch(PR_URL);

        server.verify();
    }

    @Test
    void rejectsAUrlThatIsNotAGitHubPullRequest() {
        setUp("");
        assertThatThrownBy(() -> client.fetch("https://evil.example.com/owner/repo/pull/1"))
            .isInstanceOf(InvalidPrUrlException.class);
        assertThatThrownBy(() -> client.fetch("https://github.com/acme/widgets"))
            .isInstanceOf(InvalidPrUrlException.class);
        server.verify();
    }

    @Test
    void reportsAMissingPullRequest() {
        setUp("");
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andRespond(withStatus(org.springframework.http.HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> client.fetch(PR_URL)).isInstanceOf(PrNotFoundException.class);
    }

    @Test
    void reportsAGitHubServerError() {
        setUp("");
        server.expect(requestTo("https://api.github.com/repos/acme/widgets/pulls/42"))
            .andRespond(withStatus(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.fetch(PR_URL)).isInstanceOf(GitHubUnavailableException.class);
    }
}
