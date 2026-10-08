"use strict";

const express = require("express");

const {
  db,
} = require("../config/firebase");

const router =
  express.Router();

/* =========================================================
   PARENT EDUCATION HUB
   SOURCE-BACKED + FIRESTORE-DYNAMIC CONTENT

   FLOW:

   Official sources
        ↓
   Curated safe baseline
        ↓
   Firestore
        ↓
   /api/guidelines
        ↓
   Parent Dashboard / Guidelines / Warning Signs

   IMPORTANT:
   - Frontend does not contain the guidance itself.
   - Guidance is loaded from Firestore.
   - Firestore content may be updated later without
     rebuilding the frontend.
   - Sources and review metadata are visible to parents.
========================================================= */

const CONTENT_VERSION =
  "2026.10.08";

const LAST_REVIEWED_AT =
  "2026-10-08";

const GUIDELINE_COLLECTION =
  "parentEducationGuidelines";

const SOURCE_COLLECTION =
  "parentEducationSources";

const META_COLLECTION =
  "parentEducationMeta";

const META_DOCUMENT =
  "current";

/* =========================================================
   URL HELPER
========================================================= */

function officialUrl(
  host,
  path
) {
  return `https://${host}${path}`;
}

/* =========================================================
   TRUSTED OFFICIAL SOURCES
========================================================= */

const TRUSTED_SOURCES = [
  {
    id:
      "cdc-positive-parenting",

    order:
      1,

    organization:
      "CDC",

    title:
      "Positive Parenting Tips",

    url:
      officialUrl(
        "www.cdc.gov",
        "/child-development/positive-parenting-tips/"
      ),

    type:
      "Government public-health guidance",

    topics: [
      "child development",
      "positive parenting",
      "age-appropriate support",
    ],

    note:
      "Age-based child-development and positive-parenting guidance for families.",
  },

  {
    id:
      "cdc-child-mental-health",

    order:
      2,

    organization:
      "CDC",

    title:
      "About Children's Mental Health",

    url:
      officialUrl(
        "www.cdc.gov",
        "/children-mental-health/about/index.html"
      ),

    type:
      "Government public-health guidance",

    topics: [
      "mental health",
      "persistent symptoms",
      "professional evaluation",
    ],

    note:
      "Explains childhood mental health, persistent or severe symptoms and when professional evaluation may help.",
  },

  {
    id:
      "cdc-parenting-teens",

    order:
      3,

    organization:
      "CDC",

    title:
      "Essentials for Parenting Teens",

    url:
      officialUrl(
        "www.cdc.gov",
        "/parenting-teens/about/index.html"
      ),

    type:
      "Government parenting resource",

    topics: [
      "adolescence",
      "communication",
      "parent-teen relationships",
    ],

    note:
      "Research-informed tools for parents and caregivers of young people ages 11–17.",
  },

  {
    id:
      "unicef-teen-mental-health",

    order:
      4,

    organization:
      "UNICEF",

    title:
      "When to help your teen find mental health support",

    url:
      officialUrl(
        "www.unicef.org",
        "/parenting/mental-health/when-help-your-teen-find-mental-health-support"
      ),

    type:
      "UN parenting guidance",

    topics: [
      "teen mental health",
      "warning signs",
      "help-seeking",
    ],

    note:
      "Guidance on noticing persistent changes in mood, behaviour and everyday functioning in adolescents.",
  },

  {
    id:
      "unicef-online-safety",

    order:
      5,

    organization:
      "UNICEF",

    title:
      "How to keep your child safe online",

    url:
      officialUrl(
        "www.unicef.org",
        "/eca/how-keep-your-child-safe-online"
      ),

    type:
      "UN digital-safety guidance",

    topics: [
      "online safety",
      "privacy",
      "digital communication",
    ],

    note:
      "Practical guidance on family rules, privacy settings, online contact and supportive conversations.",
  },

  {
    id:
      "unicef-pakistan-digital-safety",

    order:
      6,

    organization:
      "UNICEF Pakistan",

    title:
      "Disrupting Harm in Pakistan — technology-facilitated exploitation and abuse",

    url:
      officialUrl(
        "www.unicef.org",
        "/pakistan/press-releases/nearly-1-16-internet-using-children-pakistan-experienced-technology-facilitated"
      ),

    type:
      "Pakistan-specific evidence",

    topics: [
      "Pakistan",
      "online exploitation",
      "adolescent digital safety",
    ],

    note:
      "Recent Pakistan-specific evidence on technology-facilitated risks affecting internet-using children and adolescents.",
  },

  {
    id:
      "who-child-maltreatment",

    order:
      7,

    organization:
      "WHO",

    title:
      "Responding to child maltreatment: a clinical handbook for health professionals",

    url:
      officialUrl(
        "www.who.int",
        "/publications/i/item/9789240048737"
      ),

    type:
      "WHO clinical handbook",

    topics: [
      "child safety",
      "supportive response",
      "maltreatment concerns",
    ],

    note:
      "Professional guidance on safe, respectful responses when child maltreatment is suspected or disclosed.",
  },

  {
    id:
      "who-child-sexual-abuse-response",

    order:
      8,

    organization:
      "WHO",

    title:
      "Responding to children and adolescents who have been sexually abused",

    url:
      officialUrl(
        "www.who.int",
        "/publications/i/item/9789241550147"
      ),

    type:
      "WHO clinical guideline",

    topics: [
      "safety",
      "trauma-informed response",
      "child autonomy",
    ],

    note:
      "Clinical guidance emphasizing safety, empathy, choice and respect for the child or adolescent.",
  },
];

/* =========================================================
   CURRENT REAL-WORLD CONTEXT

   This is a dated population-level snapshot.
   It is NOT an individual-risk prediction.
========================================================= */

const CURRENT_CONTEXT = [
  {
    id:
      "pakistan-online-safety-2026",

    title:
      "Pakistan digital-safety snapshot",

    text:
      "UNICEF reported in September 2026 that nearly 1 in 16 internet-using children aged 12–17 in Pakistan experienced at least one form of technology-facilitated sexual exploitation and abuse in a single year.",

    asOf:
      "2026-09-03",

    sourceId:
      "unicef-pakistan-digital-safety",

    note:
      "This population-level statistic provides context only; it does not predict what is happening to any individual child.",
  },
];

/* =========================================================
   AGE-SPECIFIC GUIDANCE
========================================================= */

const GUIDELINES = [
  /* =======================================================
     0–3 YEARS
  ======================================================= */

  {
    id:
      "0-3",

    order:
      1,

    title:
      "0–3 years",

    shortTitle:
      "Early years",

    subtitle:
      "Responsive care, safety and early boundaries",

    overview:
      "Babies and toddlers depend on predictable, responsive care and safe relationships. Parents can support healthy development with consistent routines, warm responses and simple age-appropriate language about comfort, body boundaries and asking for help.",

    children: [
      "Their body deserves gentle and respectful care.",

      "They can show discomfort through words, sounds, facial expressions or behaviour.",

      "Trusted caregivers should respond when they are distressed or need comfort.",

      "As language develops, simple words such as no, stop and help can be introduced.",
    ],

    teach: [
      "Respond consistently to distress and comfort needs.",

      "Use simple, correct words for body parts as language develops.",

      "Allow a child to show when physical affection or touch feels uncomfortable.",

      "Build predictable routines around sleep, meals, play and care.",

      "Model calm, respectful touch and communication.",
    ],

    warnings: [
      "Persistent or major changes in sleep, eating or usual behaviour.",

      "New, intense fear around a particular person, place or routine.",

      "Marked withdrawal, unusually low engagement or loss of previously comfortable behaviour.",

      "Repeated physical distress or injuries that do not have a clear explanation.",

      "Regression or behaviour changes that are persistent and concerning to the caregiver.",
    ],

    dont: [
      "Do not force hugs, kisses or other physical affection.",

      "Do not shame a child for expressing fear or discomfort.",

      "Do not ignore persistent changes because a child is too young to explain them clearly.",

      "Do not repeatedly question a very young child about a suspected event.",
    ],

    conversations: [
      "Your body belongs to you.",

      "You can tell me when something feels wrong.",

      "You can say stop.",

      "I am here when you need help.",
    ],

    boundaries: [
      "Respect signs of discomfort during ordinary affection and care.",

      "Model asking before touching or taking something that belongs to another person.",

      "Keep care routines predictable and reassuring.",

      "Teach that trusted adults help keep children safe.",
    ],

    digital: [
      "Keep internet-connected device use closely supervised.",

      "Choose age-appropriate content and use child-friendly settings.",

      "Avoid unsupervised private communication with unknown people.",

      "Keep cameras, microphones and location permissions limited to what is necessary.",
    ],

    respond: [
      "Stay calm and focus first on safety and reassurance.",

      "Notice whether the change is repeated, persistent or getting worse.",

      "Write down practical observations rather than trying to diagnose the cause yourself.",

      "Speak with a qualified child-health professional if changes persist or safety is uncertain.",
    ],

    help:
      "Seek qualified professional advice when changes are severe, persistent, unexplained or interfere with normal development and daily functioning. If you believe the child is in immediate danger, contact appropriate local emergency or child-protection services.",

    urgent: [],

    sourceIds: [
      "cdc-positive-parenting",
      "cdc-child-mental-health",
      "who-child-maltreatment",
    ],
  },

  /* =======================================================
     4–6 YEARS
  ======================================================= */

  {
    id:
      "4-6",

    order:
      2,

    title:
      "4–6 years",

    shortTitle:
      "Young children",

    subtitle:
      "Body awareness, trust and safe communication",

    overview:
      "Young children are building independence, language and social skills. Parents can support them with clear routines, simple safety rules, respectful boundaries and regular opportunities to talk about feelings and trusted adults.",

    children: [
      "They are allowed to say no to unwanted touch.",

      "Private body areas deserve respect and privacy.",

      "They can tell a trusted adult when a secret, touch or interaction feels unsafe.",

      "Asking for help should not get them into trouble.",

      "They can keep seeking help if their first attempt is not understood.",
    ],

    teach: [
      "Use clear, age-appropriate language about private body areas and personal boundaries.",

      "Help them identify several trusted adults they can approach.",

      "Explain that unsafe secrets or uncomfortable interactions should be shared with a trusted adult.",

      "Use calm, consistent rules and explain what behaviour is expected.",

      "Give limited age-appropriate choices to support confidence and independence.",
    ],

    warnings: [
      "Persistent fear of a particular adult, place or activity.",

      "Repeated nightmares or major changes in sleep.",

      "Ongoing withdrawal, aggression, anxiety or unusually intense distress.",

      "Loss of previously established skills or significant regression.",

      "Repeated headaches, stomach aches or other complaints without a clear explanation.",

      "Sexualised language or behaviour that is significantly unusual for the child's developmental stage.",
    ],

    dont: [
      "Do not threaten or punish a child for telling you something difficult.",

      "Do not blame the child for another person's behaviour.",

      "Do not repeatedly interrogate the child or demand every detail at once.",

      "Do not dismiss strong fear as imagination without considering the wider situation.",

      "Do not force contact with a person the child persistently fears while you are assessing safety.",
    ],

    conversations: [
      "What made you feel happy or worried today?",

      "Who are the grown-ups you can ask for help?",

      "What can you do if something makes you feel uncomfortable?",

      "Are there any secrets that made you feel worried or scared?",
    ],

    boundaries: [
      "Ask before physical affection when practical.",

      "Respect reasonable refusal and teach the child to respect other people's boundaries too.",

      "Keep privacy rules simple and consistent.",

      "Model calm problem-solving when emotions are strong.",
    ],

    digital: [
      "Use age-appropriate parental controls and privacy settings.",

      "Choose suitable games, videos and websites together.",

      "Keep online communication with unknown people supervised.",

      "Teach that full name, school, address, photos and location should not be shared without a trusted adult.",

      "Encourage the child to tell you if anything online feels scary, confusing or uncomfortable.",
    ],

    respond: [
      "Listen without reacting with anger, panic or disbelief.",

      "Use simple open questions rather than repeated or leading questions.",

      "Reassure the child that speaking up was the right thing to do.",

      "Focus on immediate safety and seek qualified advice when concerns are significant or persistent.",
    ],

    help:
      "Seek professional support when emotional or behavioural changes persist, become severe, interfere with home, school or play, or are connected to a possible safety concern.",

    urgent: [],

    sourceIds: [
      "cdc-positive-parenting",
      "cdc-child-mental-health",
      "unicef-online-safety",
      "who-child-maltreatment",
    ],
  },

  /* =======================================================
     7–10 YEARS
  ======================================================= */

  {
    id:
      "7-10",

    order:
      3,

    title:
      "7–10 years",

    shortTitle:
      "Childhood",

    subtitle:
      "Confidence, boundaries, school life and speaking up",

    overview:
      "School-age children can understand more detailed ideas about privacy, friendships, safe and unsafe behaviour, online contact and how to ask adults for help. Regular low-pressure conversations help parents notice changes early.",

    children: [
      "They have a right to reasonable privacy and personal boundaries.",

      "They can ask for help whenever something feels unsafe or confusing.",

      "Harmful behaviour by another person is not their fault.",

      "A trusted adult should take safety concerns seriously.",

      "Unsafe secrets should be shared with a trusted adult.",
    ],

    teach: [
      "Teach clear personal boundaries and respect for other people's boundaries.",

      "Explain that online identities may not always be genuine.",

      "Teach how to block, leave and report uncomfortable online interactions.",

      "Encourage problem-solving while making it clear that adult help is available.",

      "Keep regular check-ins about school, friendships, games and online spaces.",
    ],

    warnings: [
      "Persistent school avoidance or loss of interest in activities previously enjoyed.",

      "A significant or sustained drop in school performance.",

      "Ongoing anxiety, irritability, sadness or social withdrawal.",

      "Major changes in sleep, eating, energy or concentration.",

      "Repeated unexplained physical complaints such as headaches or stomach aches.",

      "Strong fear of a particular person, situation or online interaction.",

      "Regular distress after using a phone, game or online platform.",
    ],

    dont: [
      "Do not minimise concerns or label persistent distress as attention-seeking.",

      "Do not punish a child for disclosing something difficult.",

      "Do not pressure them to give every detail immediately.",

      "Do not promise complete secrecy if safety may require qualified outside help.",

      "Do not publicly confront another person in front of the child while facts and safety are still being assessed.",
    ],

    conversations: [
      "What was the easiest and hardest part of today?",

      "Is anything at school or online making you feel worried or left out?",

      "Who would you talk to if you needed help and I was not nearby?",

      "What should we do if someone online asks for personal information or a private photo?",
    ],

    boundaries: [
      "Respect reasonable privacy while maintaining age-appropriate supervision.",

      "Teach that consent and boundaries apply in friendships, games and physical interactions.",

      "Use clear family rules that explain both expectations and reasons.",

      "Avoid using humiliation as discipline.",
    ],

    digital: [
      "Review privacy and account settings together.",

      "Discuss gaming chats, direct messages, cyberbullying and suspicious links.",

      "Teach children not to share passwords or personal information with friends or strangers.",

      "Agree on what to do if inappropriate, frightening or sexual content appears.",

      "Keep communication open so reporting an online problem does not automatically mean losing all device access.",
    ],

    respond: [
      "Listen carefully and thank the child for telling you.",

      "Ask what they need to feel safer rather than immediately taking over the conversation.",

      "Look for patterns across home, school, friendships, sleep and online activity.",

      "Seek professional evaluation when symptoms are persistent, severe or interfere with daily functioning.",
    ],

    help:
      "Consider qualified support when several warning signs persist, functioning at home or school changes significantly, or the child describes harm, serious fear or repeated online exploitation or bullying.",

    urgent: [
      "Seek urgent help if the child is in immediate danger or has a serious injury.",
    ],

    sourceIds: [
      "cdc-positive-parenting",
      "cdc-child-mental-health",
      "unicef-online-safety",
      "who-child-maltreatment",
    ],
  },

  /* =======================================================
     11–14 YEARS
  ======================================================= */

  {
    id:
      "11-14",

    order:
      4,

    title:
      "11–14 years",

    shortTitle:
      "Early teens",

    subtitle:
      "Independence, relationships, emotions and digital life",

    overview:
      "Early adolescence brings rapid physical, emotional and social change. Supportive relationships remain protective while young people need increasing independence, privacy and respectful conversations about relationships, mental health and online safety.",

    children: [
      "Healthy relationships respect boundaries, privacy and the right to say no.",

      "Pressure, threats, humiliation and controlling behaviour are not signs of a healthy relationship.",

      "They can ask for help from a parent, trusted adult, school professional or qualified health professional.",

      "Online pressure or exploitation is not their fault.",

      "Their feelings deserve attention even when adults do not fully understand the situation yet.",
    ],

    teach: [
      "Talk openly about healthy friendships, relationships and consent.",

      "Help them identify emotions and ways to cope safely with stress.",

      "Discuss digital footprints, privacy settings, image-sharing and online pressure.",

      "Use age-appropriate monitoring with clear expectations rather than secret surveillance whenever possible.",

      "Make it clear that asking for mental-health support is acceptable.",
    ],

    warnings: [
      "Persistent sadness, irritability, anxiety or withdrawal lasting for weeks.",

      "Loss of interest in friends or activities they normally enjoy.",

      "Significant changes in sleep, eating, energy, concentration or school performance.",

      "Repeated hopeless, worthless or strongly self-blaming statements.",

      "Sudden secrecy, fear or distress connected to a person, relationship or online contact.",

      "Unexplained injuries, repeated risk-taking or substance use.",

      "Self-injury, talking about wanting to die, or statements suggesting they do not want to be alive.",
    ],

    dont: [
      "Do not dismiss serious distress as 'just hormones' without looking at duration and impact.",

      "Do not shame the young person for relationships, online mistakes or asking for help.",

      "Do not respond to disclosure with threats, blame or public confrontation.",

      "Do not remove all privacy as the automatic first response to a problem.",

      "Do not promise secrecy when there is an immediate safety risk.",
    ],

    conversations: [
      "I've noticed you seem different lately. Would you like to talk, or would another time feel easier?",

      "How are things going with friends, school and online?",

      "Is anyone pressuring you to do something you do not want to do?",

      "What helps when stress feels too much?",

      "Who else would you feel comfortable talking to if you needed support?",
    ],

    boundaries: [
      "Agree on privacy and safety expectations together where possible.",

      "Give increasing independence as responsibility and maturity grow.",

      "Keep non-negotiable safety rules clear and proportionate.",

      "Respect the teen's need for dignity when correcting behaviour.",
    ],

    digital: [
      "Review privacy settings, location sharing and account security together.",

      "Discuss sexual pressure, coercion, image-sharing, impersonation and blackmail risks in age-appropriate language.",

      "Agree on what the teen should do if an online interaction becomes threatening or exploitative.",

      "Encourage reporting without making device confiscation the automatic consequence.",

      "Talk about misinformation, harmful content and how algorithms can shape what they see.",
    ],

    respond: [
      "Choose a calm time and listen more than you speak.",

      "Acknowledge the young person's feelings without immediately trying to solve everything.",

      "Look at persistence and impact on sleep, school, relationships and daily functioning.",

      "Involve a qualified health or mental-health professional when concerning changes last for weeks or interfere with everyday life.",

      "When safety is at risk, prioritize protection while explaining what will happen next as clearly as possible.",
    ],

    help:
      "Seek professional help when distress persists for weeks, daily functioning is affected, or there are concerning changes in mood, behaviour, sleep, eating, school or relationships.",

    urgent: [
      "Seek urgent local help if the young person talks about suicide, has made a suicide plan, has seriously self-harmed, is in immediate danger, or reports current abuse or exploitation that places them at risk.",
    ],

    sourceIds: [
      "cdc-parenting-teens",
      "cdc-child-mental-health",
      "unicef-teen-mental-health",
      "unicef-online-safety",
      "unicef-pakistan-digital-safety",
      "who-child-maltreatment",
      "who-child-sexual-abuse-response",
    ],
  },

  /* =======================================================
     15–18 YEARS
  ======================================================= */

  {
    id:
      "15-18",

    order:
      5,

    title:
      "15–18 years",

    shortTitle:
      "Older teens",

    subtitle:
      "Autonomy, mental health, relationships and preparation for adulthood",

    overview:
      "Older teenagers need meaningful autonomy while still benefiting from reliable adults who listen, set proportionate safety boundaries and help them access qualified support when concerns affect wellbeing or daily functioning.",

    children: [
      "They deserve respectful communication and growing involvement in decisions that affect them.",

      "Consent can be withdrawn and pressure or coercion is not acceptable.",

      "Seeking mental-health support is a responsible choice, not a failure.",

      "Online abuse, blackmail, stalking or non-consensual image-sharing should be taken seriously.",

      "They can ask for help even after making a mistake or taking a risk.",
    ],

    teach: [
      "Discuss healthy relationships, consent, coercion and respect directly and without shaming.",

      "Help them plan how to seek healthcare, mental-health support and trusted-adult support independently.",

      "Discuss online reputation, privacy, location sharing, scams and image-based abuse.",

      "Agree on safety expectations for travel, social events and relationships while respecting growing autonomy.",

      "Model how adults ask for help, repair mistakes and manage conflict respectfully.",
    ],

    warnings: [
      "Persistent sadness, anxiety, irritability, hopelessness or social withdrawal.",

      "Loss of interest in previously meaningful activities or relationships.",

      "Significant changes in sleep, eating, energy, concentration or academic functioning.",

      "Escalating substance use, dangerous risk-taking or repeated unexplained injuries.",

      "Extreme fear, coercion or control within a relationship or online interaction.",

      "Self-injury, suicidal thoughts, talking about death or saying others would be better off without them.",

      "Sudden disappearance, threats, blackmail or exploitation involving sexual images or online contact.",
    ],

    dont: [
      "Do not ridicule or dismiss mental-health concerns.",

      "Do not use humiliation or threats to force disclosure.",

      "Do not automatically treat every mistake as evidence that the teen cannot be trusted at all.",

      "Do not promise secrecy if there is an immediate risk of serious harm.",

      "Do not attempt to handle serious abuse, exploitation or suicide risk alone.",
    ],

    conversations: [
      "How have you been coping lately — really?",

      "Is anything making you feel unsafe, controlled or pressured?",

      "If you needed confidential professional support, how could I help you access it?",

      "Are there any online situations, messages or images that you wish had never happened?",

      "What kind of support from me feels useful instead of intrusive?",
    ],

    boundaries: [
      "Make expectations clear while involving the teen in decisions whenever possible.",

      "Respect reasonable privacy unless there is a concrete safety concern.",

      "Use consequences that are proportionate, explained and connected to the behaviour.",

      "Support increasing independence in health, education, work and relationships.",
    ],

    digital: [
      "Encourage strong unique passwords, multi-factor authentication and careful location sharing.",

      "Discuss consent before sharing another person's image or information.",

      "Talk openly about sextortion, blackmail, impersonation, stalking and coercive online behaviour.",

      "Keep a plan for blocking, preserving evidence and reporting serious online abuse.",

      "Review privacy settings periodically because platforms and defaults change over time.",
    ],

    respond: [
      "Stay calm enough that the teen can keep talking.",

      "Ask what support they want while being clear about any immediate safety responsibilities.",

      "Take persistent changes in functioning seriously even when the teen cannot explain a single cause.",

      "Offer choices about qualified professional support where possible.",

      "For abuse, exploitation or suicide risk, prioritize immediate safety and appropriate professional or emergency support.",
    ],

    help:
      "Seek professional support when concerning changes persist for weeks, affect everyday functioning, or involve significant anxiety, depression, substance use, trauma, unsafe relationships or exploitation.",

    urgent: [
      "Seek urgent local help for suicidal intent or planning, serious self-harm, immediate danger, severe intoxication or overdose, or current abuse or exploitation creating an immediate safety risk.",
    ],

    sourceIds: [
      "cdc-parenting-teens",
      "cdc-child-mental-health",
      "unicef-teen-mental-health",
      "unicef-online-safety",
      "unicef-pakistan-digital-safety",
      "who-child-maltreatment",
      "who-child-sexual-abuse-response",
    ],
  },
];

/* =========================================================
   FIRESTORE SEED / VERSION MANAGEMENT

   First request automatically creates:
   - parentEducationGuidelines
   - parentEducationSources
   - parentEducationMeta

   No manual Firestore setup is required.

   If Firestore content is edited while CONTENT_VERSION
   remains the same, those edits remain dynamic and are not
   overwritten on every request.
========================================================= */

async function ensureContentStore() {
  const metaRef =
    db
      .collection(
        META_COLLECTION
      )
      .doc(
        META_DOCUMENT
      );

  const metaSnapshot =
    await metaRef.get();

  if (
    metaSnapshot.exists &&
    metaSnapshot
      .data()
      ?.contentVersion ===
      CONTENT_VERSION
  ) {
    return;
  }

  const batch =
    db.batch();

  const now =
    new Date();

  /* SOURCES */

  for (
    const source
    of TRUSTED_SOURCES
  ) {
    const ref =
      db
        .collection(
          SOURCE_COLLECTION
        )
        .doc(
          source.id
        );

    batch.set(
      ref,

      {
        ...source,

        contentVersion:
          CONTENT_VERSION,

        updatedAt:
          now,
      },

      {
        merge:
          true,
      }
    );
  }

  /* GUIDELINES */

  for (
    const guideline
    of GUIDELINES
  ) {
    const ref =
      db
        .collection(
          GUIDELINE_COLLECTION
        )
        .doc(
          guideline.id
        );

    batch.set(
      ref,

      {
        ...guideline,

        contentVersion:
          CONTENT_VERSION,

        reviewedAt:
          LAST_REVIEWED_AT,

        updatedAt:
          now,
      },

      {
        merge:
          true,
      }
    );
  }

  /* META */

  batch.set(
    metaRef,

    {
      contentVersion:
        CONTENT_VERSION,

      reviewedAt:
        LAST_REVIEWED_AT,

      storage:
        "firestore",

      sourceModel:
        "official-source-backed curated guidance",

      disclaimer:
        "Educational information only. This content does not diagnose abuse, trauma or mental-health conditions and is not a substitute for professional or emergency care.",

      urgentSafetyNote:
        "If a child or teenager is in immediate danger, has a serious injury, reports current abuse or exploitation, or expresses suicidal intent or a suicide plan, seek appropriate local emergency or professional help immediately.",

      context:
        CURRENT_CONTEXT,

      updatedAt:
        now,
    },

    {
      merge:
        true,
    }
  );

  await batch.commit();
}

/* =========================================================
   FIRESTORE READERS
========================================================= */

async function readSources() {
  const snapshot =
    await db
      .collection(
        SOURCE_COLLECTION
      )
      .orderBy(
        "order",
        "asc"
      )
      .get();

  return snapshot.docs.map(
    doc => ({
      id:
        doc.id,

      ...doc.data(),
    })
  );
}

async function readGuidelines() {
  const snapshot =
    await db
      .collection(
        GUIDELINE_COLLECTION
      )
      .orderBy(
        "order",
        "asc"
      )
      .get();

  return snapshot.docs.map(
    doc => ({
      id:
        doc.id,

      ...doc.data(),
    })
  );
}

async function readMeta() {
  const snapshot =
    await db
      .collection(
        META_COLLECTION
      )
      .doc(
        META_DOCUMENT
      )
      .get();

  return snapshot.exists
    ? {
        id:
          snapshot.id,

        ...snapshot.data(),
      }
    : null;
}

function sourcesForGuideline(
  guideline,
  sources
) {
  const wanted =
    new Set(
      Array.isArray(
        guideline
          ?.sourceIds
      )
        ? guideline
            .sourceIds
        : []
    );

  return sources.filter(
    source =>
      wanted.has(
        source.id
      )
  );
}

/* =========================================================
   GET ALL GUIDANCE + SOURCE PROVENANCE
========================================================= */

router.get(
  "/",

  async (
    _req,
    res
  ) => {
    try {
      await ensureContentStore();

      const [
        guidelines,
        sources,
        meta,
      ] =
        await Promise.all([
          readGuidelines(),
          readSources(),
          readMeta(),
        ]);

      return res.json({
        success:
          true,

        guidelines,

        sources,

        meta,
      });
    } catch (error) {
      console.error(
        "Parent guidance load error:",

        error?.code ||
          error?.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "Could not load source-backed parent guidance.",
        });
    }
  }
);

/* =========================================================
   GET TRUSTED SOURCE DIRECTORY
========================================================= */

router.get(
  "/resources",

  async (
    _req,
    res
  ) => {
    try {
      await ensureContentStore();

      const [
        sources,
        meta,
      ] =
        await Promise.all([
          readSources(),
          readMeta(),
        ]);

      return res.json({
        success:
          true,

        sources,

        meta,
      });
    } catch (error) {
      console.error(
        "Parent guidance source load error:",

        error?.code ||
          error?.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "Could not load trusted parent resources.",
        });
    }
  }
);

/* =========================================================
   GET SINGLE AGE GROUP
========================================================= */

router.get(
  "/:ageGroup",

  async (
    req,
    res
  ) => {
    try {
      await ensureContentStore();

      const ageGroup =
        String(
          req.params
            .ageGroup ||
            ""
        ).trim();

      if (
        !/^(0-3|4-6|7-10|11-14|15-18)$/
          .test(
            ageGroup
          )
      ) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Invalid age group.",
          });
      }

      const [
        snapshot,
        sources,
        meta,
      ] =
        await Promise.all([
          db
            .collection(
              GUIDELINE_COLLECTION
            )
            .doc(
              ageGroup
            )
            .get(),

          readSources(),

          readMeta(),
        ]);

      if (
        !snapshot.exists
      ) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Guidance for this age group is unavailable.",
          });
      }

      const guideline = {
        id:
          snapshot.id,

        ...snapshot.data(),
      };

      return res.json({
        success:
          true,

        guideline,

        sources:
          sourcesForGuideline(
            guideline,
            sources
          ),

        meta,
      });
    } catch (error) {
      console.error(
        "Parent guidance age load error:",

        error?.code ||
          error?.message
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            "Could not load guidance for this age group.",
        });
    }
  }
);

module.exports =
  router;