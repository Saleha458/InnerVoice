const express = require("express");

const router = express.Router();

/*
 * Parent Education Hub's canonical content.
 * Old Firestore guidelines are not used by these routes.
 */

const GUIDELINES = [
  {
    id: "0-3",
    order: 1,
    title: "0–3 years",
    shortTitle: "Early years",
    subtitle: "Safety, trust and healthy attachment",

    overview:
      "Very young children depend on predictable care, comfort and trusted adults. At this stage, parents can begin teaching simple body autonomy while creating a strong sense of safety.",

    // NOW AN ARRAY: displays as bullet points
    children: [
      "Their body belongs to them.",
      "They can express discomfort through words, sounds or behaviour.",
      "Trusted caregivers should respond when something feels wrong.",
      "Simple words such as no, stop and help can be introduced as they develop.",
    ],

    teach: [
      "Use simple and correct words for body parts.",
      "Teach that their body belongs to them.",
      "Allow them to show when touch or physical affection feels uncomfortable.",
      "Teach simple words such as stop, no and help.",
      "Help them recognise their regular trusted caregivers.",
    ],

    warnings: [
      "Sudden fear around a particular person.",
      "Strong distress during routine care or physical contact.",
      "Persistent changes in sleeping or eating.",
      "Unusual withdrawal or major changes in behaviour.",
      "Loss of previously comfortable or settled behaviour.",
    ],

    dont: [
      "Do not force hugs, kisses or physical affection.",
      "Do not shame a child for expressing discomfort.",
      "Do not dismiss repeated or sudden behavioural changes.",
      "Do not make the child responsible for an adult's feelings.",
    ],

    conversations: [
      "Your body belongs to you.",
      "You can tell me when something feels wrong.",
      "You can always come to me.",
      "You do not have to hug someone if you do not want to.",
    ],

    boundaries: [
      "Respect physical boundaries.",
      "Do not force affection.",
      "Model gentle and respectful touch.",
      "Ask before taking or touching something that belongs to them.",
    ],

    // NOW AN ARRAY: displays as bullet points
    digital: [
      "Keep device use closely supervised.",
      "Choose age-appropriate content.",
      "Avoid unsupervised private communication with unknown people online.",
      "Stay involved whenever a young child uses an internet-connected device.",
    ],

    respond: [
      "Stay calm and provide reassurance.",
      "Observe whether concerning behaviour is persistent or repeated.",
      "Avoid repeatedly questioning the child.",
      "Seek qualified advice when changes continue or safety is a concern.",
    ],

    help:
      "Seek qualified professional advice when behavioural changes are persistent, severe, unexplained or create concerns about the child's immediate safety.",
  },

  {
    id: "4-6",
    order: 2,
    title: "4–6 years",
    shortTitle: "Young children",
    subtitle: "Body awareness and safe communication",

    overview:
      "Children at this age can begin understanding privacy, body boundaries, trusted adults and the difference between situations that feel safe and unsafe.",

    children: [
      "They are allowed to say no to unwanted touch.",
      "Their private body areas deserve respect.",
      "They can tell a trusted adult about an unsafe secret.",
      "Asking for help should not get them into trouble.",
      "They can keep telling trusted adults if their first attempt to get help is not heard.",
    ],

    teach: [
      "Teach that they are allowed to say no.",
      "Explain private body areas using age-appropriate language.",
      "Help them identify two or three trusted adults.",
      "Teach that secrets involving safety or uncomfortable touch should always be shared.",
      "Reassure them that asking for help will not result in punishment.",
    ],

    warnings: [
      "Sudden fear of a particular adult or place.",
      "Regression in behaviour.",
      "Frequent nightmares or major sleeping changes.",
      "Sudden aggression, anxiety or withdrawal.",
      "Sexualised language or behaviour significantly unusual for their age.",
      "Repeated unexplained physical complaints.",
    ],

    dont: [
      "Do not threaten a child for telling the truth.",
      "Do not blame them for another person's behaviour.",
      "Do not repeatedly interrogate them.",
      "Do not dismiss their fear as imagination.",
      "Do not force interaction with someone they strongly fear.",
    ],

    conversations: [
      "What makes you feel safe?",
      "Did anything make you uncomfortable today?",
      "Who are your trusted adults?",
      "What can you do if someone asks you to keep an unsafe secret?",
    ],

    boundaries: [
      "Ask before physical affection.",
      "Respect reasonable refusal.",
      "Teach that other people's boundaries matter too.",
      "Model healthy boundaries in everyday family life.",
    ],

    digital: [
      "Use age-appropriate parental controls and supervision.",
      "Choose suitable games, videos and websites.",
      "Teach children not to communicate privately with unknown people.",
      "Explain that personal information should not be shared without a trusted adult.",
      "Encourage children to tell you if something online makes them uncomfortable.",
    ],

    respond: [
      "Listen without reacting with anger or shock.",
      "Use simple, open questions instead of repeated questioning.",
      "Tell them they did the right thing by speaking.",
      "Take ongoing fear or behavioural changes seriously.",
    ],

    help:
      "Seek professional support when warning signs are persistent, significant or connected to a possible safety concern.",
  },

  {
    id: "7-10",
    order: 3,
    title: "7–10 years",
    shortTitle: "Childhood",
    subtitle: "Confidence, boundaries and speaking up",

    overview:
      "Children can understand more detailed ideas about privacy, consent, safe and unsafe secrets, online behaviour and how to ask for help.",

    children: [
      "Trusted adults should listen when they share a concern.",
      "They have a right to personal boundaries and privacy.",
      "They can ask for help whenever something feels unsafe.",
      "Harmful behaviour by another person is not their fault.",
      "Unsafe secrets should be shared with a trusted adult.",
    ],

    teach: [
      "Teach clear personal boundaries.",
      "Explain the difference between safe surprises and unsafe secrets.",
      "Teach how and where to ask for help.",
      "Encourage them to report uncomfortable behaviour.",
      "Introduce basic password and online privacy safety.",
    ],

    warnings: [
      "Avoidance of school or activities they previously enjoyed.",
      "Sudden decline in school performance.",
      "Unexplained anxiety or frequent fear.",
      "Social withdrawal.",
      "Significant changes in sleep.",
      "Strong fear of a particular person or situation.",
      "Repeated self-blaming statements.",
    ],

    dont: [
      "Do not immediately accuse or confront someone in front of the child.",
      "Do not minimise their concerns.",
      "Do not punish a child for disclosure.",
      "Do not pressure them to give every detail immediately.",
      "Do not promise complete secrecy if their safety requires outside help.",
    ],

    conversations: [
      "Has anything made you uncomfortable recently?",
      "What would you do if someone asked you to keep an unsafe secret?",
      "Who could you contact if you needed help?",
      "Do you feel comfortable telling me when something is wrong?",
    ],

    boundaries: [
      "Respect reasonable privacy.",
      "Teach consent in age-appropriate situations.",
      "Allow children to express discomfort.",
      "Teach that they must respect other people's boundaries too.",
    ],

    digital: [
      "Explain that people online may not always be who they claim to be.",
      "Discuss safety in gaming chats and private messages.",
      "Teach children not to share passwords or personal information.",
      "Discuss what to do when inappropriate or frightening content appears.",
      "Encourage children to tell a trusted adult about uncomfortable online interactions.",
    ],

    respond: [
      "Listen carefully without blaming.",
      "Validate that their feelings matter.",
      "Ask what would help them feel safer.",
      "Seek appropriate support when concerns are serious or persistent.",
    ],

    help:
      "Consider qualified professional support when multiple warning signs persist, daily functioning changes significantly or the child describes harm or serious fear.",
  },

  {
    id: "11-14",
    order: 4,
    title: "11–14 years",
    shortTitle: "Early teens",
    subtitle: "Independence, relationships and trusted communication",

    overview:
      "Early teenagers need growing independence while still having reliable adults who can discuss relationships, privacy, online safety and emotional wellbeing without immediate judgement.",

    children: [
      "Healthy friendships and relationships respect personal boundaries.",
      "Pressure, manipulation and controlling behaviour are not signs of a healthy relationship.",
      "They can say no and withdraw consent.",
      "Their digital privacy and personal information matter.",
      "They can seek support from trusted adults or qualified professionals.",
    ],

    teach: [
      "Discuss healthy friendship and relationship boundaries.",
      "Explain manipulation, pressure and controlling behaviour.",
      "Teach digital consent and privacy.",
      "Encourage communication with trusted adults.",
      "Explain that consent can be changed or withdrawn.",
    ],

    warnings: [
      "Extreme or sudden isolation.",
      "Major personality changes.",
      "Persistent self-blame.",
      "Fear of going home, school or meeting a particular person.",
      "Major changes in sleep or school engagement.",
      "Secretive online activity combined with visible distress.",
      "Persistent anxiety, hopelessness or emotional shutdown.",
    ],

    dont: [
      "Do not invade privacy unnecessarily.",
      "Do not respond with anger to disclosure.",
      "Do not blame the young person.",
      "Do not ridicule friendships or relationship concerns.",
      "Do not use threats to force communication.",
    ],

    conversations: [
      "How are your friendships or relationships making you feel?",
      "Do you feel safe at home, school and online?",
      "Is there anything you wish adults understood better?",
      "Has anyone been pressuring you to do something you do not want to do?",
    ],

    boundaries: [
      "Respect growing independence.",
      "Discuss mutual respect in friendships and relationships.",
      "Teach that consent can be withdrawn.",
      "Set reasonable family expectations without removing all privacy.",
    ],

    digital: [
      "Discuss online grooming and pressure from unknown contacts.",
      "Explain the risks of sharing private or intimate images.",
      "Talk about sextortion and online harassment without blaming the young person.",
      "Review location-sharing and account privacy settings together.",
      "Encourage them to seek help if someone threatens or pressures them online.",
    ],

    respond: [
      "Choose a calm and private place to talk.",
      "Listen before immediately giving advice.",
      "Avoid automatically removing all privacy unless urgent safety requires action.",
      "Work together on a practical safety plan.",
    ],

    help:
      "Seek qualified professional support when distress, fear, safety concerns, major behavioural changes or significant impairment continue.",
  },

  {
    id: "15-18",
    order: 5,
    title: "15–18 years",
    shortTitle: "Teen years",
    subtitle: "Autonomy, relationships and long-term safety",

    overview:
      "Older teenagers need autonomy, privacy and respect while still knowing that trusted adults are available when relationships, safety or emotional wellbeing become difficult.",

    children: [
      "They have a right to consent and personal boundaries.",
      "Healthy relationships should not involve coercion or threats.",
      "They can seek help when emotional distress becomes difficult to manage.",
      "They should know how to identify trusted people and professional support.",
      "They can make informed choices about privacy and digital safety.",
    ],

    teach: [
      "Discuss healthy relationships and consent.",
      "Explain coercion, manipulation and controlling behaviour.",
      "Encourage clear personal boundaries.",
      "Help teenagers identify trusted and professional support.",
      "Discuss emotional wellbeing and healthy coping strategies.",
    ],

    warnings: [
      "Persistent hopelessness.",
      "Fear connected to a person, relationship or place.",
      "Sudden or extreme isolation.",
      "Major academic or behavioural changes.",
      "Statements about self-harm or suicide.",
      "Significant changes in sleeping or eating.",
      "A controlling relationship or strong fear of upsetting another person.",
      "Sudden withdrawal from trusted friends or family.",
    ],

    dont: [
      "Do not shame them.",
      "Do not threaten punishment for disclosure.",
      "Do not dismiss serious emotional distress as attention-seeking.",
      "Do not automatically take control of every decision unless immediate safety requires it.",
      "Do not blame them for another person's harmful behaviour.",
    ],

    conversations: [
      "Do you feel safe and respected in your relationships?",
      "Is anyone pressuring, threatening or controlling you?",
      "Is something happening that you are afraid to tell someone about?",
      "Would you like support from someone outside the family?",
      "What would make you feel safer right now?",
    ],

    boundaries: [
      "Respect reasonable privacy.",
      "Model consent and respectful communication.",
      "Respect their right to say no.",
      "Discuss emotional, physical and digital boundaries.",
      "Support independence while remaining available.",
    ],

    digital: [
      "Review privacy settings and location sharing.",
      "Discuss the risks of sending or sharing intimate images.",
      "Explain online scams, impersonation and grooming.",
      "Discuss sextortion and online harassment without blaming the teenager.",
      "Talk about digital footprints and how online information can spread.",
      "Identify trusted people or services to contact if someone threatens them online.",
    ],

    respond: [
      "Listen without immediately judging the relationship or situation.",
      "Take threats, coercion and safety concerns seriously.",
      "Include the teenager in decisions whenever safely possible.",
      "Help them access qualified support when needed.",
    ],

    help:
      "Seek qualified professional or emergency support when safety is at risk, particularly when there are threats, severe distress, self-harm or suicidal thoughts.",
  },
];

/* =========================================================
   GET ALL GUIDELINES
========================================================= */

router.get("/", (req, res) => {
  return res.json({
    success: true,
    guidelines: GUIDELINES,
  });
});

/* =========================================================
   GET ONE AGE GROUP
========================================================= */

router.get("/:ageGroup", (req, res) => {
  const ageGroup = String(req.params.ageGroup || "").trim();

  const guideline = GUIDELINES.find(
    (item) => item.id === ageGroup
  );

  if (!guideline) {
    return res.status(404).json({
      success: false,
      message: "Age group not found.",
    });
  }

  return res.json({
    success: true,
    guideline,
  });
});

module.exports = router;