import { useState } from "react";

const AGE_GROUPS = [
  {
    id: "0-3",
    title: "0–3 years",
    subtitle:
      "Building safety, trust and healthy attachment",
    color: "soft",
    content: {
      children:
        "Children at this age need predictable care, affection, comfort and a sense that adults will keep them safe.",
      teach: [
        "Teach that their body belongs to them.",
        "Use simple words for body parts.",
        "Teach that uncomfortable touch can be refused.",
        "Respond calmly when they express fear or discomfort.",
      ],
      warnings: [
        "Sudden fear around a particular person.",
        "Unusual withdrawal or changes in behaviour.",
        "Sleep or eating changes without an obvious reason.",
        "Extreme distress during routine care.",
      ],
      dont: [
        "Do not shame a child for expressing discomfort.",
        "Do not force physical affection.",
        "Do not dismiss sudden behavioural changes.",
      ],
      conversations: [
        "Your body belongs to you.",
        "You can tell me when something feels wrong.",
        "You can always come to me.",
      ],
      boundaries: [
        "Respect physical boundaries.",
        "Do not force hugs or kisses.",
        "Teach gentle and respectful touch.",
      ],
      digital:
        "At this age, keep devices supervised and avoid unsupervised access to online communication.",
      help:
        "Seek professional advice when behavioural changes are persistent, severe or concerning.",
    },
  },

  {
    id: "4-6",
    title: "4–6 years",
    subtitle:
      "Body awareness and safe communication",
    color: "blue",
    content: {
      children:
        "Children can begin understanding privacy, boundaries, trusted adults and the difference between safe and unsafe situations.",
      teach: [
        "Teach children that they can say no.",
        "Explain private body areas in age-appropriate language.",
        "Identify two or three trusted adults.",
        "Teach children that secrets about safety should always be shared.",
      ],
      warnings: [
        "Fear of a particular adult.",
        "Regression in behaviour.",
        "Frequent nightmares.",
        "Unexplained sexualised behaviour.",
        "Sudden aggression or withdrawal.",
      ],
      dont: [
        "Do not threaten children for telling the truth.",
        "Do not blame them for an adult's behaviour.",
        "Do not interrogate repeatedly.",
      ],
      conversations: [
        "What makes you feel safe?",
        "Is there anything that made you uncomfortable?",
        "Who are your trusted adults?",
      ],
      boundaries: [
        "Ask before physical affection.",
        "Respect a child's refusal.",
        "Model healthy boundaries yourself.",
      ],
      digital:
        "Use parental supervision and teach children never to communicate privately with unknown people online.",
      help:
        "Get professional support if warning signs are persistent or significant.",
    },
  },

  {
    id: "7-10",
    title: "7–10 years",
    subtitle:
      "Confidence, boundaries and speaking up",
    color: "purple",
    content: {
      children:
        "Children should understand that trusted adults listen to them and that abuse or inappropriate behaviour is never their fault.",
      teach: [
        "Teach clear personal boundaries.",
        "Explain safe and unsafe secrets.",
        "Teach children how to ask for help.",
        "Encourage them to report uncomfortable behaviour.",
      ],
      warnings: [
        "Avoidance of school or activities.",
        "Sudden decline in performance.",
        "Unexplained anxiety.",
        "Social withdrawal.",
        "Changes in sleep.",
      ],
      dont: [
        "Do not accuse without listening.",
        "Do not minimise concerns.",
        "Do not punish a child for disclosure.",
      ],
      conversations: [
        "Has anyone made you uncomfortable?",
        "What would you do if someone asked you to keep an unsafe secret?",
        "Who could you contact for help?",
      ],
      boundaries: [
        "Respect privacy.",
        "Teach consent in age-appropriate situations.",
        "Allow children to express discomfort.",
      ],
      digital:
        "Discuss online strangers, private messages, passwords and inappropriate content.",
      help:
        "Consider professional support when there are multiple warning signs or a disclosure of harm.",
    },
  },

  {
    id: "11-14",
    title: "11–14 years",
    subtitle:
      "Independence, identity and trusted communication",
    color: "rose",
    content: {
      children:
        "Young people increasingly need privacy while still knowing that support is available without judgement.",
      teach: [
        "Teach healthy relationship boundaries.",
        "Discuss manipulation and pressure.",
        "Explain digital consent and privacy.",
        "Encourage speaking with trusted adults.",
      ],
      warnings: [
        "Extreme isolation.",
        "Sudden personality changes.",
        "Self-blame.",
        "Fear of going home or meeting someone.",
        "Major changes in sleep or school engagement.",
      ],
      dont: [
        "Do not invade privacy unnecessarily.",
        "Do not respond with anger to disclosure.",
        "Do not blame the young person.",
      ],
      conversations: [
        "How are your relationships making you feel?",
        "Do you feel safe at home and online?",
        "Is there anything you wish adults understood better?",
      ],
      boundaries: [
        "Respect growing independence.",
        "Discuss mutual respect.",
        "Teach that consent can be withdrawn.",
      ],
      digital:
        "Discuss sextortion, grooming, private images, unknown contacts and digital footprints.",
      help:
        "Professional support is appropriate when distress, fear or safety concerns are significant.",
    },
  },

  {
    id: "15-18",
    title: "15–18 years",
    subtitle:
      "Autonomy, relationships and long-term safety",
    color: "gold",
    content: {
      children:
        "Teenagers need autonomy, respect and reliable access to supportive adults without fear of punishment.",
      teach: [
        "Teach healthy relationships and consent.",
        "Discuss coercion and manipulation.",
        "Encourage boundaries in relationships.",
        "Help teenagers identify professional support.",
      ],
      warnings: [
        "Persistent hopelessness.",
        "Fear of a person or place.",
        "Sudden isolation.",
        "Major academic or behavioural changes.",
        "Self-harm or suicidal statements.",
      ],
      dont: [
        "Do not shame.",
        "Do not threaten punishment for disclosure.",
        "Do not dismiss emotional distress as attention-seeking.",
      ],
      conversations: [
        "Do you feel safe in your relationships?",
        "Is anyone pressuring or controlling you?",
        "Would you like help from someone outside the family?",
      ],
      boundaries: [
        "Respect privacy.",
        "Model consent.",
        "Respect their right to say no.",
      ],
      digital:
        "Discuss privacy settings, location sharing, intimate images, scams, grooming and online harassment.",
      help:
        "Seek professional or emergency support when safety is at risk, especially with self-harm or suicidal thoughts.",
    },
  },
];

export default function Guidelines({
  section = "guidelines",
}) {
  const [selected, setSelected] =
    useState("0-3");

  const group =
    AGE_GROUPS.find(
      (item) =>
        item.id === selected
    ) || AGE_GROUPS[0];

  const data = group.content;

  if (section === "warnings") {
    return (
      <div className="parent-hub-page">

        <div className="parent-hub-header">
          <span className="eyebrow">
            PARENT EDUCATION HUB
          </span>

          <h1>
            Warning Signs
          </h1>

          <p>
            Behavioural changes can have many
            causes. Look for patterns, listen
            calmly and take concerns seriously.
          </p>
        </div>

        <div className="age-tabs">
          {AGE_GROUPS.map((item) => (
            <button
              key={item.id}
              className={
                selected === item.id
                  ? "age-tab active"
                  : "age-tab"
              }
              onClick={() =>
                setSelected(item.id)
              }
            >
              {item.title}
            </button>
          ))}
        </div>

        <section className="parent-content-card warning-card">
          <h2>
            {group.title}
          </h2>

          <p>
            {group.subtitle}
          </p>

          <h3>
            Signs worth paying attention to
          </h3>

          <ul className="warning-list">
            {data.warnings.map(
              (item) => (
                <li key={item}>
                  {item}
                </li>
              )
            )}
          </ul>

          <div className="help-highlight">
            <strong>
              When to seek professional help
            </strong>

            <p>
              {data.help}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="parent-hub-page">

      <div className="parent-hub-header">
        <span className="eyebrow">
          PARENT EDUCATION HUB
        </span>

        <h1>
          Helping children feel safe,
          heard and respected.
        </h1>

        <p>
          Choose an age group to explore
          practical guidance for healthy
          boundaries, communication and safety.
        </p>
      </div>

      <div className="age-tabs">
        {AGE_GROUPS.map((item) => (
          <button
            key={item.id}
            className={
              selected === item.id
                ? "age-tab active"
                : "age-tab"
            }
            onClick={() =>
              setSelected(item.id)
            }
          >
            {item.title}
          </button>
        ))}
      </div>

      <section className="parent-content-card">

        <div className="parent-age-heading">
          <div>
            <span className="eyebrow">
              AGE GROUP
            </span>

            <h2>
              {group.title}
            </h2>

            <p>
              {group.subtitle}
            </p>
          </div>
        </div>

        <div className="parent-info-grid">

          <InfoCard
            title="What children need to know"
            text={data.children}
          />

          <ListCard
            title="What parents should teach"
            items={data.teach}
          />

          <ListCard
            title="What NOT to do"
            items={data.dont}
          />

          <ListCard
            title="Conversation starters"
            items={data.conversations}
          />

          <ListCard
            title="Healthy boundaries"
            items={data.boundaries}
          />

          <InfoCard
            title="Digital safety"
            text={data.digital}
          />

        </div>

        <div className="help-highlight">
          <strong>
            When to seek professional help
          </strong>

          <p>
            {data.help}
          </p>
        </div>

      </section>

    </div>
  );
}

function InfoCard({
  title,
  text,
}) {
  return (
    <article className="parent-info-card">
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function ListCard({
  title,
  items,
}) {
  return (
    <article className="parent-info-card">
      <h3>{title}</h3>

      <ul>
        {items.map((item) => (
          <li key={item}>
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}