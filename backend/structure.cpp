#include<iostream>
#include<string>
#include<vector>

using namespace std;

//string ko check karne ke lia class 
class checkstring{
public:

    // Rabin karp algorithm true return karega agar pattern mila to verna false
    bool RabinKarp(string tocheck,string pattern){

    }

    //RabinKarp ke liye hashing function jo kisi bhi substring ka hash value calculate karega
    // hashing se hum pattern ko efficiently compare kar skte hein bina har barr poori string ko match kiye 
    // ye ek rolling hash use karega taaki ham O(1) time me next substring ka hash nikal sakein
    long long HashFunction(string text, int length){

    }

    // same ye bhi check krega agar pattern mila to true return kar dega vrna false
    bool KMP(string tocheck,string pattern){ 
        int n = tocheck.size();
        int m = pattern.size();
        vector<int>lps = PreprocessPattern(pattern);

        int i = 0,j = 0;
        while(i < n){
            if(tocheck[i] == pattern[j]){
                i++;
                j++;
            }
            if(j == m)return true;

            else if(i<n && tocheck[i] != pattern[j]){
                if(j != 0){
                    j = lps[j-1];
                }
                else{
                    i++;
                }
            }
        }
        return false;
    }

    // KMP or RabinKarp ke lia pattern ka preprocessing krega or partial match table return krega
    // preprocessing se hame bar bar string ko match krne ka extra kam bach jata he
    // jis se overall Time complexity O(n) ho jati he or code efficient ho jata he 
    // (Partial Match Table: Ye ek table hoti hai jo bataati hai ki ek pattern ke andar kaunse prefixes aur suffixes match ho rahe hain)
    vector<int> PreprocessPattern(string pattern){  
        int n = pattern.length();
        vector<int>Lps(n,0);
        int j = 0;

        for(int i = 1 ; i<n ; i++){
            while(j>0 && pattern[i] != pattern[j]){
                j = Lps[j-1];
            }
        if(pattern[i] == pattern[j]){
            j++;
            Lps[i] = j;
        }
        }

        return Lps;
    }
};

// Text ko analyse krne ke lia class
class TextAnalysis{
public:
    // Do text ke beech ka edit distance calculate krega jitna kam hoga utna similar honge (0.0 - 1.0 range)
    double EditDistance(string text1,string text2){

    }

    // Do strings ko compare kkrega agar similar hain to true return kar dega vrna false
    double CompareStrings(string text1,string text2){

    }
};


class ProctoringSystem{
public:

    //Student ke answer aur correct answer ko analyze krega cheating detect hoti he to true return kr dega
    bool AnalyzeText(string StudentAns, string CorrectAns){

    }

    // Exam ka final report generaate krega 
    void GenerateReport(){

    }
};

class Logger{
public:

    // jo bhi suspicious activity hogi uska log store kr lega
    void LogActivity(){

    }

    void LogCheatingIncident(string studentId,string details){

    }

    void viewLog(){

    }
};


class server{
public:
    void StartServer(){

    }
    void HandleRequest(string requestbody){

    }
};

class DataBaseManager{
public:
    void SaveResponse(string studentId,string answer, bool ischeating){

    }

    vector<string> FetchPrevResponse(string studentId){

    }
};

class TextPreprocessor{
public:
    string RemovePunctuation(string text){

    }

    string ConvertToLowerCase(string text){

    }

    vector<string> Tokenize(string text){

    }
};

class ReportGenerator{
public:
    void GenerateStudentReport(string studentId){

    }
    
    void ExportToPdf(string ReportData){

    }
};
int main(){

}