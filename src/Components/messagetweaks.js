import { react_basic } from '../Assets/Files/React-Basic.js';
import { SendToWelcome,SendToIntroduction, SendToStart, SendToCompare, Next_Question, Interview_Ended, FollowupQuestion, Interview_Summary } from './apiService.js';
import { generateWelcomePrompt,generateIntroductionPrompt,interviewPrompts, generateSummaryPrompt } from '../Assets/Files/Prompt.js';

// Initialize interview state
const questionsToBeAsked = new Map(Object.entries(react_basic));
let lastAskedQuestion = null;
const Company_Name = "IMMCO Software Solutions";
const store_conversation = {};
let candidateInfo = null;

// Add a function to fetch candidate info
const fetchCandidateInfo = async (candidateId) => {
  try {
    const response = await fetch(`http://localhost:5000/get-candidate-info/${candidateId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch candidate information');
    }
    
    candidateInfo = await response.json();
  } catch (error) {
    console.error('Error fetching candidate info:', error);
  }
};

//Process interview transcript and handle different interview stages
export const processTranscript = async (transcript, questionAsked, additional, candidateId) => {
  try {
    // Fetch candidate info if not already fetched
    if (!candidateInfo) {
      await fetchCandidateInfo(candidateId);  // Pass candidateId here
    }

    // Define prompts for different interview stages using the fetched name
    const prompts = {
      welcome: generateWelcomePrompt(Company_Name, candidateInfo.candidateName),
      introduction: generateIntroductionPrompt(candidateInfo.candidateName, transcript),
      start: interviewPrompts.generateStartPrompt(transcript),
      next_question: interviewPrompts.generateNextQuestionPrompt(candidateInfo.candidateName),
      interview_end: interviewPrompts.generateInterviewEndPrompt(candidateInfo.candidateName),
      summary: generateSummaryPrompt(JSON.stringify(store_conversation, null, 2)),
      followup: interviewPrompts.generateFollowupPrompt(questionAsked),
      compare: lastAskedQuestion ? 
        interviewPrompts.generateComparePrompt(
          lastAskedQuestion.question, 
          lastAskedQuestion.expected_answer, 
          transcript
        ) : "No previous question found.",
      comparefollowup: interviewPrompts.generateFollowupComparePrompt(questionAsked, transcript)
    };
    
    // Rest of the code remains the same...
    const modelMapping = {
      welcome: SendToWelcome,
      introduction: SendToIntroduction,
      start: SendToStart,
      compare: SendToCompare,
      next_question: Next_Question,
      followup: FollowupQuestion,
      comparefollowup: SendToCompare,
      interview_end: Interview_Ended,
      summary: Interview_Summary
    };

    if (additional === "generate") {
      const QuestionToBeAsked = getRandomQuestion();
      console.log("Question: ", QuestionToBeAsked);
    
      // Find the next available question number
      let questionIndex = 1;
      while (store_conversation[`Question ${questionIndex}`]) {
        questionIndex++;
      }
    
      // Store the new question with the next available number
      store_conversation[`Question ${questionIndex}`] = QuestionToBeAsked;
    
      return QuestionToBeAsked;
    }
    

    if (prompts[additional] && modelMapping[additional]) {
      const response = await modelMapping[additional](prompts[additional]);
      
      // Pass candidateId here
      storeConversationByStage(additional, response, transcript, candidateId);
      
      if (additional === "compare" || additional === "comparefollowup") 
      {
        const { filteredResponse, coverage } = extractCoverageAndFilter(response);
        return [filteredResponse, coverage];
      }

      if(additional === "summary")
      {
        const result = extractNumbers(response);
        await saveRankings(result, candidateId); // Pass candidateId here
        return result;
      }
          
      return response;
    }
    
    throw new Error("Invalid additional parameter");
  } catch (error) {
    console.error(`Error in processTranscript (${additional}):`, error);
    return "An error occurred. Please try again.";
  }
};


//Store conversation data based on interview stage
const storeConversationByStage = (stage, response, transcript, candidateId) => {
  const stageMapping = {
    welcome: () => store_conversation["Welcome Message"] = response,

    introduction: () => {
      store_conversation["Candidate Welcome Reply"] = transcript;
      store_conversation["Introduction Question"] = response;
    },

    start: () => {  
      store_conversation["Candidate Introduction Reply"] = transcript;
      store_conversation["Start The Question Message"] = response;
    },

    compare: () => {
      let answerIndex = 1;
      while (store_conversation[`Candidate Answer ${answerIndex}`]) {
        answerIndex++;
      }
      store_conversation[`Candidate Answer ${answerIndex}`] = transcript;

      let feedbackIndex = 1;
      while (store_conversation[`Question_Feedback ${feedbackIndex}`]) {
        feedbackIndex++;
      }
      store_conversation[`Question_Feedback ${feedbackIndex}`] = response;
    },

    followup: () => {
      let followupIndex = 1;
      while (store_conversation[`Followup_Question ${followupIndex}`]) {
        followupIndex++;
      }
      store_conversation[`Followup_Question ${followupIndex}`] = response;
    },

    comparefollowup: () => {
      // Store the candidate's answer to the followup question
      let followupAnswerIndex = 1;
      while (store_conversation[`Candidate Followup_Answer ${followupAnswerIndex}`]) {
        followupAnswerIndex++;
      }
      store_conversation[`Candidate Followup_Answer ${followupAnswerIndex}`] = transcript;

      // Store the feedback for the followup answer
      let followupFeedbackIndex = 1;
      while (store_conversation[`Followup_Question_Feedback ${followupFeedbackIndex}`]) {
        followupFeedbackIndex++;
      }
      store_conversation[`Followup_Question_Feedback ${followupFeedbackIndex}`] = response;
    },

    interview_end: async () => {
      store_conversation["Interview_End"] = response;
      await saveConversationToFile(candidateId); // Pass candidateId here
    }
  };

  if (stageMapping[stage]) {
    stageMapping[stage]();
  }
};

//Save conversation to server
const saveConversationToFile = async (candidateId) => {
  try {
    const infoResponse = await fetch(`http://localhost:5000/get-candidate-info/${candidateId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!infoResponse.ok) {
      throw new Error('Failed to fetch candidate information');
    }
    
    const candidateInfo = await infoResponse.json();

    const response = await fetch('http://localhost:5000/save-conversation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: store_conversation,
        candidateName: candidateInfo.candidateName,
        candidateId: candidateId,
        postId: candidateInfo.postId
      })
    });
    
    if (!response.ok) throw new Error('Failed to save conversation');
    
    const result = await response.json();
    console.log('Conversation saved:', result);
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
};

const saveRankings = async (rankings, candidateId) => {
  try {
    const infoResponse = await fetch(`http://localhost:5000/get-candidate-info/${candidateId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!infoResponse.ok) {
      throw new Error('Failed to fetch candidate information');
    }
    
    const candidateInfo = await infoResponse.json();

    const response = await fetch('http://localhost:5000/save-rankings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rankings,
        candidateName: candidateInfo.candidateName,
        candidateId: candidateId,
        postId: candidateInfo.postId
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save rankings');
    }
    
    const result = await response.json();
    console.log('Rankings saved:', result);
  } catch (error) {
    console.error('Error saving rankings:', error);
  }
};

//Extract coverage score from response
const extractCoverageAndFilter = (response) => {
  console.log("Response: "+response)
  const coverageRegex = /coverage=(\d+)/i;
  const match = response.match(coverageRegex);
  
  let coverage = null;
  let filteredResponse = response;

  if (match) {
    coverage = parseInt(match[1], 10);
    filteredResponse = response.replace(coverageRegex, '').trim();
  }

  return { filteredResponse, coverage };
};


//Get random question from question pool
const getRandomQuestion = () => {
  if (questionsToBeAsked.size === 0) return "No more questions available.";
  
  const keys = [...questionsToBeAsked.keys()];
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  const { question, expected_answer } = questionsToBeAsked.get(selectedKey);
  
  lastAskedQuestion = { key: selectedKey, question, expected_answer };
  questionsToBeAsked.delete(selectedKey);
  
  return question;
};

//Get the Ranking of the candidate
// Get the Ranking of the candidate
function extractNumbers(text) {
  const match = text.match(/Lan=(\d+)\s+Sub=(\d+)\s+Beh=(\d+)\s+Sum=(.+)/);

  if (match) {
      return [
          parseInt(match[1], 10),
          parseInt(match[2], 10),
          parseInt(match[3], 10),
          match[4].trim()
      ];
  } else {
      return null;
  }
}


