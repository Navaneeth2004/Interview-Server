// interviewPrompts.js
export const generateWelcomePrompt = (companyName, candidateName) => 
  `You are conducting an interview for a full stack developer position at ${companyName}. Welcome the candidate, ${candidateName}, and ask him to introduce himself.`;

export const generateIntroductionPrompt = (candidateName, transcript) =>
  `You are conducting an interview. Candidate's name is ${candidateName}, Field is full stack dev. This is Candidate's introduction: ${transcript}`;

export const generateSummaryPrompt = (transcript) =>
  `I will provide you with a conversation of an interviewer and a candidate. Rank the candidate based on three criterias. 
   1. Language fluency 2. Subject knowledge 3. behaviour. And as output just give me these three rankings out of 10 and also provide a small summary of how candidate did in this format.
   Lan=number Sub=number Beh=number Sum=summary \n.
   Conversation: ${transcript}`

export const interviewPrompts = {
  generateStartPrompt: (transcript) => 
    `Introduction is over. provide a breif feedback to what the candidate said and Tell the Candidate that we are moving on to the questions. Candidate said: ${transcript}`,

  generateNextQuestionPrompt: (candidateName) =>
    `You are an interviewer. tell the candidate that we are getting into the next question also don't ask them if they are ready. Candidate name: ${candidateName}`,

  generateInterviewEndPrompt: (candidateName) =>
    `You are an interviewer. the interview has ended. Tell that to the candidate. Candidate name: ${candidateName}`,

  generateFollowupPrompt: (questionAsked) =>
    `You are an interviewer. Ask a followup question based upon the previous question. Just ask the queston and no '*' should be there. Also question should be purely theoritical don't ask code examples. Also make the question easier than the previous question. Previous Question: ${questionAsked}`,

  generateComparePrompt: (question, expectedAnswer, transcript) =>
    `You are an Interviewer. Compare the expected answer and candidate answer and give coverage in the end like eg: Coverage=80.
     Question: ${question}
     Expected Answer: ${expectedAnswer}
     Candidate Answer: ${transcript}`,

  generateFollowupComparePrompt: (question, transcript) =>
    `You are an Interviewer. Compare candidate answer and give coverage in the end like eg: Coverage=80.
     Question: ${question}
     Candidate Answer: ${transcript}`
};