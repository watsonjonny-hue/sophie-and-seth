// netlify/functions/tailor-cv.js
//
// Serverless function that tailors either Ella Watson's or Max Gurdon's CV to a
// specific job description using the Claude API. The API key lives only in
// Netlify's environment variables (set in Site settings -> Environment variables),
// never in this file or in the browser, so it's safe to deploy this on a public site.
// The frontend sends a "person" field ("sophie" or "seth") to pick which CV to use.

const MASTER_CV_SOPHIE = `
ELLA WATSON
Stevenage, Hertfordshire | 07984 810141 | ellamimiwatson@hotmail.com

SUMMARY
First-Class Fashion Marketing graduate (BA Hons, Leeds Beckett University, 2023-2026)
combining three years' academic grounding in fashion PR, brand marketing, visual
communication and editorial writing with hands-on industry experience across showroom
operations, live PR campaigns and content creation - most recently as a showroom intern
for a Paris Resort 2027 buying week. Skilled in Adobe Creative Suite and social media
strategy, with a strong ability to adapt, lead and communicate effectively across
fast-paced, client-facing environments.

KEY SKILLS
- Fashion PR & Media Relations
- Showroom & Buying Week Operations
- Brand Marketing & Campaign Strategy
- Visual Communication & Editorial Writing
- Content Creation & Social Media Strategy (Adobe Creative Suite)
- Communication & Leadership

EDUCATION
BA (Hons) Fashion Marketing - Leeds Beckett University, 2023-2026
First Class Honours. Three-year programme combining critical and practical study of
fashion public relations, brand marketing, visual communication and editorial writing,
with coursework spanning campaign case studies, brand strategy projects and critical
essays across the fashion industry. Achieved first-class results in Public Relations,
Visual Communication, Editorial Writing and Brand Marketing.

Hitchin Girls' School Sixth Form, 2021-2023
A-Levels: History (B), Media (B), Business (B). History ambassador for Year 7 and
Business ambassador for Year 10.

WORK EXPERIENCE
Showroom Intern - Arddun Agency, Paris - Resort 2027 Showroom (June 2026)
- Assisted the set-up of a multi-brand Paris showroom for brands including PH5,
  Faithfull, Alemais, Altuzarra and Stine Goya, hanging and steaming samples and
  preparing the model changing area ahead of market week.
- Rotated through dresser, front-of-house and runner roles across the buying week,
  supporting models, buyers and the sales team during appointments.
- Maintained daily end-of-day standards, keeping samples, changing areas and stock
  organised to a professional retail standard.

London Fashion Week Intern - Lobby PR (February 2026)
- Supported the PR team across multiple runway shows including AGRO Studios, Ksenia
  Schnaider, Sinead Gorey and Lavin Karakoc.
- Managed show setup, guest flow and reserved seating for talent, and distributed
  press releases.

Social Media Content Creator - @hautemarketing on TikTok (October 2025 - Present)
- Produce fashion-inspired short-form content, analysing trends, runway shows and
  style inspiration.

Student Ambassador & Course Representative - Leeds Beckett University (Oct 2023 - May 2026)
- Represented the Fashion Marketing course at open days and provided feedback to
  course leaders; supported university events including the graduate fashion shoot.

English Second Language Tutor - Bell Beyond, Italy (August - September 2025)
- Taught English to children aged 6-8 using games, crafts and creative themes while
  living with a host family.

Dance & Drama Instructor - Barracudas Activity Camp (July - August 2024)
- Delivered performing arts sessions daily for children aged 4-14, independently
  managing sign-in/out and safeguarding.
`.trim();

const MASTER_CV_SETH = `
MAX GURDON
Agricultural Professional - Arable - Estates - Game
Berry Barn, Ingleberry Farm, Ingleberry Road, Shepshed, Leicestershire LE12 9DE
maxgurdon@yahoo.co.uk | 07931 218997

PROFILE
A degree-qualified agricultural professional with experience spanning commercial
arable farming, utility infrastructure and private estate management. Currently
Head Groundsman and shoot host at Whatton House; previously Agricultural Liaison
Officer at Dalcour Maclaren, working between major infrastructure clients and the
farming community. Comfortable working independently, managing landowner
relationships under pressure, and presenting a confident face to guests and clients.

SKILLS
- Combining (4/5), Crop spraying (5/5), Drilling (3/5), Cultivations (3/5),
  Machinery maintenance (3/5)

CERTIFICATES
- PA1 & PA2 (Pesticide application), PA6A (Handheld application), Telehandler
  operator, Crawler licence, Abrasive wheels, Welding

OTHER
- Bronze & Silver Duke of Edinburgh, Harper Adams Shooting Club, Young Farmers
  Club (Herts), Head of Boarding at Heath Mount, Rugby & cricket U13-U16

EMPLOYMENT
Whatton House, Long Whatton, Leicestershire - Head Groundsman (September 2024 - Present)
- Responsible for the upkeep of all grounds and gardens on the estate.
- Erects and manages temporary structures for corporate events and weddings.
- Hosts the estate shoots - welcoming guests, delivering safety briefings and
  accompanying guns on the drives.
- Game bird shoots through the winter season; simulated game days through the
  summer.

Dalcour Maclaren, Langley Priory Estate, Derbyshire - Agricultural Liaison Officer (January 2023 - August 2024)
- Principal point of contact between the infrastructure client and affected
  landowners, occupiers and agents throughout construction.
- Secured land access consents and managed day-to-day concerns of farmers,
  drawing on practical agricultural knowledge to maintain trust on both sides.
- Monitored construction activity on agricultural land - topsoil stripping,
  drainage, fencing and reinstatement - ensuring works met agreed standards and
  minimised disruption to farming operations.
- Managed own caseload of landowner agreements independently, reporting progress
  to the wider project team.

Wallasea Farms, Essex - Farm Worker (2020 - 2023)
- Combine driver for two seasons on a large-scale commercial arable operation.
- Lead spray-man for three seasons - implementing crop protection plans across
  the farm's arable acreage.
- Secondary drill-man for two seasons.
- Cultivations, winter machinery maintenance and fabrication; ditch and drain
  maintenance year-round.
- Crop protection and pest control through spring and winter; contractor liaison.

Walkern Hall, Walkern - Underkeeper (5 seasons)
- Attended five seasons of organised shoots, learning all the drives and ensuring
  birds were presented correctly for the guns. Responsible for making the day
  run well for guests.

Wildstrain Game Farm, Cromer - Game Farm Worker
- Raised 30,000 birds from day-old chicks to the first day of shooting - pen
  building, bitting, mowing, pest control, feeding and poult delivery to clients.

EDUCATION
Harper Adams University (2016-2020) - BSc Agriculture. Placement year at
Wallasea Farms led directly to a full-time position on graduation.
Shuttleworth College, Biggleswade (2014-2016) - BTEC Level 3 Agriculture, Distinction.
Bishops Stortford College (2011-2014) - 10 GCSEs, all grade C and above.
Heath Mount School, Hertfordshire (2008-2011) - Head of Boarding.
Hill House International School, London (2002-2008).
`.trim();

function systemPromptFor(person) {
  const isSeth = person === "seth";
  const masterCv = isSeth ? MASTER_CV_SETH : MASTER_CV_SOPHIE;
  const audience = isSeth
    ? "an experienced agricultural/estates professional (grounds & shoot management, rural land agency, or agronomy roles)"
    : "a recent fashion marketing graduate";

  return `You are an expert CV editor helping ${audience} tailor their CV to a specific job posting.

Rules you must follow strictly:
- Never invent experience, employers, dates, skills, certificates, or achievements that are not present in the master CV below.
- You MAY reorder sections and bullets, re-word bullets to mirror the job description's language, adjust emphasis, and tighten or expand phrasing of things that are genuinely true.
- You MAY write a short tailored 2-3 sentence summary/profile at the top specific to this role, as long as every claim in it is supported by the master CV.
- Keep the output as plain text formatted like a CV (section headings in capitals, bullets with "-"), suitable for pasting into a document.
- At the end, add a short section titled "TAILORING NOTES" (2-4 bullet points) explaining what you emphasised or reordered and why, so the family reviewing this understands the reasoning.

Master CV:
${masterCv}`;
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { role, company, jobDescription, notes, person } = payload;
  const who = person === "seth" ? "seth" : "sophie";

  if (!jobDescription || jobDescription.trim().length < 30) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Please paste the job description (at least a few sentences)." }),
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server is not configured with an API key yet. Add ANTHROPIC_API_KEY in Netlify site settings." }),
    };
  }

  const userMessage = `Job title: ${role || "(not given)"}
Company: ${company || "(not given)"}
${notes ? `Extra notes from the family: ${notes}\n` : ""}
Job description:
${jobDescription}

Please produce the tailored CV now.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: systemPromptFor(who),
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Claude API error", detail: errText.slice(0, 500) }),
      };
    }

    const data = await resp.json();
    const text = (data.content || []).map((c) => c.text || "").join("\n").trim();

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ cv: text }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unexpected server error", detail: String(err) }),
    };
  }
};
