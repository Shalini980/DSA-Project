#include <iostream>
#include <string>
#include <vector>
#include <cstring>
#include <algorithm>
#include <unordered_map>
#include <cstdlib>
#include <ctime>
#include "httplib.h"
#include "nlohmann/json.hpp"

using json = nlohmann::json;
using namespace std;

// 1. Levenshtein Distance Algorithm
int levenshteinDistance(const string& s1, const string& s2) {
    int m = s1.length();
    int n = s2.length();
    
    // Create a matrix of size (m+1) x (n+1)
    vector<vector<int>> dp(m + 1, vector<int>(n + 1, 0));
    
    // Initialize the matrix
    for (int i = 0; i <= m; ++i)dp[i][0] = i;
    
    for (int j = 0; j <= n; ++j)dp[0][j] = j;
    
    // Fill the matrix
    for (int i = 1; i <= m; ++i) {
        for (int j = 1; j <= n; ++j) {
            if (s1[i - 1] == s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + min({dp[i - 1][j],      // Delete ke lia
                                    dp[i][j - 1],      // Insert ke lia
                                    dp[i - 1][j - 1]}); // Replace ke lia
            }
        }
    }
    return dp[m][n];
}
// Calculate similarity percentage based on Levenshtein distance
double levenshteinSimilarity(const string& s1, const string& s2) {
    int maxLength = max(s1.length(), s2.length());
    if (maxLength == 0) return 100.0; // Both strings are empty
    
    int distance = levenshteinDistance(s1, s2);
    return (1.0 - static_cast<double>(distance) / maxLength) * 100.0;
}



// 2. Rabin-Karp Algorithm
vector<int> rabinKarp(const string& text, const string& pattern) {
    vector<int> matches;
    int n = text.length();
    int m = pattern.length();
    
    if (m > n || m == 0) return matches;
    
    const int prime = 101;
    const int alphabet = 256;
    
    // Calculate hash for pattern and first window of text
    int patternHash = 0;
    int textHash = 0;
    int h = 1;
    
    // Calculate h = pow(alphabet, m-1) % prime
    for (int i = 0; i < m - 1; i++) {
        h = (h * alphabet) % prime;
    }
    
    // Calculate initial hash values
    for (int i = 0; i < m; i++) {
        patternHash = (alphabet * patternHash + pattern[i]) % prime;
        textHash = (alphabet * textHash + text[i]) % prime;
    }
    
    // Slide the pattern over text one by one
    for (int i = 0; i <= n - m; i++) {
        // Check if hash values match
        if (patternHash == textHash) {
            // Check each character
            bool match = true;
            for (int j = 0; j < m; ++j) {
                if (text[i + j] != pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                matches.push_back(i);
            }
        }
        
        // Calculate hash value for next window
        if (i < n - m) {
            textHash = (alphabet * (textHash - text[i] * h) + text[i + m]) % prime;
            if (textHash < 0) {
                textHash += prime;
            }
        }
    }
    
    return matches;
}




// Calculate similarity using Rabin-Karp (matching patterns)
double rabinKarpSimilarity(const string& text1, const string& text2) {
    if (text1.empty() || text2.empty()) {
        return text1.empty() && text2.empty() ? 100.0 : 0.0;
    }
    
    // Use the shorter text as pattern to search in the longer text
    const string& pattern = text1.length() <= text2.length() ? text1 : text2;
    const string& text = text1.length() <= text2.length() ? text2 : text1;
    
    int totalMatches = 0;
    int substrLength = static_cast<int>(min(pattern.length(), static_cast<size_t>(10))); // Use reasonable substr size
    
    // Try multiple substrings from the pattern
    for (size_t i = 0; i + substrLength <= pattern.length(); i += substrLength / 2) {
        string substr = pattern.substr(i, substrLength);
        vector<int> matches = rabinKarp(text, substr);
        totalMatches += matches.size();
    }
    
    // Calculate similarity based on matches found
    double maxPossibleMatches = pattern.length() / (substrLength / 2.0);
    double similarity = min(100.0, (totalMatches / maxPossibleMatches) * 100.0);
    
    return similarity;
}



// 3. KMP (Knuth-Morris-Pratt) Algorithm
vector<int> computeLPSArray(const string& pattern) {
    int m = pattern.length();
    vector<int> lps(m, 0);
    
    int len = 0;
    int i = 1;
    
    while (i < m) {
        if (pattern[i] == pattern[len]) {
            len++;
            lps[i] = len;
            i++;
        } else {
            if (len != 0)len = lps[len - 1];
            else{
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}

vector<int> kmpSearch(const string& text, const string& pattern) {
    vector<int> matches;
    int n = text.length();
    int m = pattern.length();
    
    if (m > n || m == 0)return matches;
    
    // compute LPS array
    vector<int>lps = computeLPSArray(pattern);
    
    int i = 0; // Index text ke lia
    int j = 0; // Index pattern ke lia
    
    while (i < n) {
        if (pattern[j] == text[i]) {
            i++;
            j++;
        }
        if (j == m) {
            matches.push_back(i - j);
            j = lps[j - 1];
        } else if (i < n && pattern[j] != text[i]) {
            if (j != 0)j = lps[j - 1];
            else i++;
        }
    }
    return matches;
}

double kmpSimilarity(const string& text1, const string& text2) {
    if (text1.empty() || text2.empty()) {
        return text1.empty() && text2.empty() ? 100.0 : 0.0;
    }
    
    const string& pattern = text1.length() <= text2.length() ? text1 : text2;
    const string& text = text1.length() <= text2.length() ? text2 : text1;
    
    int totalMatches = 0;
    int substrLength = static_cast<int>(min(pattern.length(), static_cast<size_t>(10))); // Use reasonable substr size
    
    for (size_t i = 0; i + substrLength <= pattern.length(); i += substrLength / 2) {
        string substr = pattern.substr(i, substrLength);
        vector<int> matches = kmpSearch(text, substr);
        totalMatches += matches.size();
    }
    
    double maxPossibleMatches = pattern.length() / (substrLength / 2.0);
    double similarity = min(100.0, (totalMatches / maxPossibleMatches) * 100.0);
    
    return similarity;
}


vector<pair<string, vector<int>>> findMatchedPatterns(const string& text1, const string& text2) {
    vector<pair<string, vector<int>>> matchedPatterns;
    
    int minMatchLength = 4;
    
    const string& pattern = text1.length() <= text2.length() ? text1 : text2;
    const string& text = text1.length() <= text2.length() ? text2 : text1;
    
    //sliding windows use kara he pattern ke lia
    for (size_t i = 0; i + minMatchLength <= pattern.length(); ++i) {
        for (size_t len = minMatchLength; i + len <= pattern.length(); ++len) {
            string substr = pattern.substr(i, len);
            
            // KMP use kara he efficient pattern matching ke lia 
            vector<int> positions = kmpSearch(text, substr);
            
            if (!positions.empty()) {
                matchedPatterns.push_back({substr, positions});
                // Skip ahead
                i += len - 1;
                break;
            }
        }
    }
    
    return matchedPatterns;
}

int main() {
    // Initialize HTTP server
    httplib::Server server;
    // Set CORS headers for all responses
    server.set_default_headers({
        {"Access-Control-Allow-Origin", "*"},
        {"Access-Control-Allow-Methods", "GET, POST, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization"}
    });
    

    // Handle OPTIONS requests for CORS preflight
    server.Options("/(.*)", [](const httplib::Request&, httplib::Response& res) {
        res.status = 204; // No content
    });
    

    // Text analysis endpoint
    server.Post("/api/analyze", [](const httplib::Request& req, httplib::Response& res) {
        try {
            json request_data = json::parse(req.body);
            
            // Extract text samples and algorithm choice
            std::string text1 = request_data["text1"];
            std::string text2 = request_data["text2"];
            std::string algorithm = request_data["algorithm"];
            
            double similarity = 0.0;
            
            // Apply the requested algorithm
            if (algorithm == "levenshtein") {
                similarity = levenshteinSimilarity(text1, text2);
            } else if (algorithm == "rabin-karp") {
                similarity = rabinKarpSimilarity(text1, text2);
            } else if (algorithm == "kmp") {
                similarity = kmpSimilarity(text1, text2);
            } else {
                res.status = 400;
                res.set_content("{\"error\":\"Invalid algorithm\"}", "application/json");
                return;
            }
            
            // Find matched patterns for highlighting
            auto matchedPatterns = findMatchedPatterns(text1, text2);
            
            // Prepare response
            json response = {
                {"similarity", similarity},
                {"matchedPatterns", json::array()}
            };
            
            for (const auto& match : matchedPatterns) {
                response["matchedPatterns"].push_back({
                    {"pattern", match.first},
                    {"positions", match.second}
                });
            }
            
            res.set_content(response.dump(), "application/json");
            
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content("{\"error\":\"" + std::string(e.what()) + "\"}", "application/json");
        }
    });
    
    server.Get("/api/info", [](const httplib::Request&, httplib::Response& res) {
        json info = {
            {"name", "ProctorShield Text Analysis Server"},
            {"version", "1.0.0"},
            {"algorithms", {"levenshtein", "rabin-karp", "kmp"}}
        };
        
        res.set_content(info.dump(), "application/json");
    });
    

    std::cout << "Starting ProctorShield Text Analysis Server on port 8080..." << std::endl;
    server.listen("0.0.0.0", 8080);
    return 0;
}