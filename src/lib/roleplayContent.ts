import type { ErrorTag } from '@/types/taxonomy'

export interface RoleplayTurn {
  id: string
  character: string          // Norwegian line
  characterEnglish: string   // English subtitle
  expectedKeywords: string[] // normalised lowercase — any one match = pass
  hint: string               // coaching tip on fallback
  modelAnswer: string        // "Prøv å si: ..." shown on retry
  targetConceptId: string    // Concept this turn exposes — MUST exist in the level's graph
  errorTag: ErrorTag         // Tag used when the user's answer misses
}

export interface RoleplayScenario {
  id: string
  title: string
  titleEnglish: string
  setting: string            // English context shown before start
  characterName: string
  turns: RoleplayTurn[]
}

const A1_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'kaffe',
    title: 'Bestille kaffe',
    titleEnglish: 'Ordering coffee',
    setting: "You're at a café in Oslo. The barista greets you.",
    characterName: 'Barista',
    turns: [
      {
        id: 'greet',
        character: 'Hei! Hva kan jeg hjelpe deg med?',
        characterEnglish: 'Hi! What can I help you with?',
        expectedKeywords: ['kaffe', 'latte', 'cappuccino', 'espresso', 'vil', 'ha', 'gjerne'],
        hint: 'Order something to drink.',
        modelAnswer: 'Jeg vil gjerne ha en kaffe, takk.',
        targetConceptId: 'common-modal-verbs',
        errorTag: 'modal-verb',
      },
      {
        id: 'size',
        character: 'Stor eller liten?',
        characterEnglish: 'Large or small?',
        expectedKeywords: ['stor', 'liten', 'medium'],
        hint: 'Choose a size.',
        modelAnswer: 'Stor, takk.',
        targetConceptId: 'basic-adjectives',
        errorTag: 'adjective-agreement',
      },
      {
        id: 'name',
        character: 'Hva er navnet ditt?',
        characterEnglish: 'What is your name?',
        expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
        hint: 'Tell them your name.',
        modelAnswer: 'Jeg heter [ditt navn].',
        targetConceptId: 'personal-pronouns',
        errorTag: 'pronoun-choice',
      },
      {
        id: 'thanks',
        character: 'Det blir femti kroner. Ha en fin dag!',
        characterEnglish: "That's fifty kroner. Have a nice day!",
        expectedKeywords: ['takk', 'tusen', 'deg', 'også', 'ha'],
        hint: 'Say thank you.',
        modelAnswer: 'Takk! Ha det bra.',
        targetConceptId: 'to-have-verb',
        errorTag: 'verb-conjugation',
      },
    ],
  },
  {
    id: 'veibeskrivelse',
    title: 'Be om veibeskrivelse',
    titleEnglish: 'Asking for directions',
    setting: "You're lost in the city. A passerby offers to help.",
    characterName: 'Forbipasserende',
    turns: [
      {
        id: 'excuse',
        character: 'Hei, kan jeg hjelpe deg?',
        characterEnglish: 'Hi, can I help you?',
        expectedKeywords: ['unnskyld', 'hjelp', 'stasjon', 'togstasjon', 'buss', 'veien', 'hvor'],
        hint: 'Ask for directions somewhere.',
        modelAnswer: 'Unnskyld, hvor er togstasjonen?',
        targetConceptId: 'question-formation',
        errorTag: 'word-order',
      },
      {
        id: 'understand',
        character: 'Togstasjonen er rett frem og til venstre ved lyskrysset.',
        characterEnglish: 'The train station is straight ahead and left at the traffic light.',
        expectedKeywords: ['forstår', 'ok', 'takk', 'skjønner', 'frem', 'venstre'],
        hint: 'Confirm you understand.',
        modelAnswer: 'Ok, rett frem og til venstre. Takk!',
        targetConceptId: 'common-prepositions',
        errorTag: 'preposition',
      },
      {
        id: 'howfar',
        character: 'Det tar omtrent fem minutter å gå.',
        characterEnglish: "It's about a five-minute walk.",
        expectedKeywords: ['takk', 'minutter', 'greit', 'bra', 'perfekt'],
        hint: 'Respond to the time estimate.',
        modelAnswer: 'Fem minutter — perfekt, takk så mye.',
        targetConceptId: 'numbers-basic',
        errorTag: 'spelling',
      },
      {
        id: 'bye',
        character: 'Bare hyggelig! God tur!',
        characterEnglish: "You're welcome! Safe travels!",
        expectedKeywords: ['takk', 'ha', 'det', 'bra', 'hyggelig'],
        hint: 'Say goodbye.',
        modelAnswer: 'Takk! Ha det bra!',
        targetConceptId: 'to-have-verb',
        errorTag: 'verb-conjugation',
      },
    ],
  },
  {
    id: 'introduksjon',
    title: 'Introdusere deg selv',
    titleEnglish: 'Introducing yourself',
    setting: 'First day at a new job. A colleague introduces themselves.',
    characterName: 'Kollega',
    turns: [
      {
        id: 'meet',
        character: 'Hei! Jeg heter Kari. Er du ny her?',
        characterEnglish: "Hi! I'm Kari. Are you new here?",
        expectedKeywords: ['heter', 'hei', 'ja', 'ny', 'navn', 'jeg'],
        hint: 'Introduce yourself.',
        modelAnswer: 'Hei! Jeg heter [ditt navn]. Ja, jeg er ny.',
        targetConceptId: 'personal-pronouns',
        errorTag: 'pronoun-choice',
      },
      {
        id: 'from',
        character: 'Hyggelig å møte deg! Hvor er du fra?',
        characterEnglish: 'Nice to meet you! Where are you from?',
        expectedKeywords: ['fra', 'bor', 'land', 'england', 'usa', 'norge', 'australia'],
        hint: 'Say where you are from.',
        modelAnswer: 'Jeg er fra England.',
        targetConceptId: 'common-prepositions',
        errorTag: 'preposition',
      },
      {
        id: 'work',
        character: 'Spennende! Hva jobber du med her?',
        characterEnglish: 'Interesting! What will you be doing here?',
        expectedKeywords: ['jobber', 'arbeider', 'avdeling', 'prosjekt', 'design', 'kode', 'salg'],
        hint: 'Describe your role.',
        modelAnswer: 'Jeg jobber med design.',
        targetConceptId: 'common-prepositions',
        errorTag: 'preposition',
      },
      {
        id: 'coffee',
        character: 'Kjempebra! Vil du ha en kopp kaffe?',
        characterEnglish: 'Great! Would you like a cup of coffee?',
        expectedKeywords: ['ja', 'takk', 'gjerne', 'kaffe', 'vil', 'ha'],
        hint: 'Accept or politely decline.',
        modelAnswer: 'Ja, gjerne! Tusen takk.',
        targetConceptId: 'common-modal-verbs',
        errorTag: 'modal-verb',
      },
    ],
  },
]

const B1_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'lege',
    title: 'Hos legen',
    titleEnglish: 'At the doctor',
    setting: "You have an appointment with your GP in Norway. The doctor greets you.",
    characterName: 'Lege',
    turns: [
      {
        id: 'lege-greet',
        character: 'Hei, kom inn! Hva kan jeg hjelpe deg med i dag?',
        characterEnglish: 'Hi, come in! What can I help you with today?',
        expectedKeywords: ['har', 'vondt', 'feber', 'hode', 'mage', 'syk', 'vondt', 'siden'],
        hint: 'Describe your symptoms: "Jeg har hatt vondt i..."',
        modelAnswer: 'Jeg har hatt vondt i halsen siden i går.',
        targetConceptId: 'past-perfect',
        errorTag: 'verb-tense',
      },
      {
        id: 'lege-how-long',
        character: 'Hvor lenge har du hatt disse plagene?',
        characterEnglish: 'How long have you had these symptoms?',
        expectedKeywords: ['dager', 'uker', 'siden', 'begynte', 'hadde', 'mandag', 'onsdag'],
        hint: 'Say how long: "Jeg har hatt det siden..." or "i ... dager".',
        modelAnswer: 'Jeg har hatt det i tre dager — det begynte mandag.',
        targetConceptId: 'past-perfect',
        errorTag: 'verb-tense',
      },
      {
        id: 'lege-medicine',
        character: 'Har du tatt noen medisiner?',
        characterEnglish: 'Have you taken any medicine?',
        expectedKeywords: ['tatt', 'paracet', 'ibux', 'medisin', 'nei', 'ja', 'prøvd'],
        hint: 'Say whether you have taken anything: "Jeg har tatt..." or "Jeg har ikke tatt...".',
        modelAnswer: 'Jeg har tatt paracetamol, men det hjalp ikke så mye.',
        targetConceptId: 'idiomatic-expressions',
        errorTag: 'meaning-misunderstood',
      },
      {
        id: 'lege-advice',
        character: 'Jeg anbefaler deg å hvile og drikke mye vann. Er det noe annet?',
        characterEnglish: 'I recommend you rest and drink plenty of water. Is there anything else?',
        expectedKeywords: ['takk', 'lurer', 'om', 'spørsmål', 'forstår', 'greit', 'bra'],
        hint: 'Thank the doctor or ask a follow-up question.',
        modelAnswer: 'Takk. Jeg lurer på om jeg trenger sykmelding.',
        targetConceptId: 'indirect-questions',
        errorTag: 'word-order',
      },
    ],
  },
  {
    id: 'jobbintervju',
    title: 'Jobbintervju',
    titleEnglish: 'Job interview',
    setting: "You are being interviewed for a position at a Norwegian company. The interviewer welcomes you.",
    characterName: 'Intervjuer',
    turns: [
      {
        id: 'intervju-intro',
        character: 'Velkommen! Kan du fortelle litt om deg selv og bakgrunnen din?',
        characterEnglish: 'Welcome! Can you tell us a bit about yourself and your background?',
        expectedKeywords: ['heter', 'jobbet', 'studert', 'erfaring', 'bakgrunn', 'tidligere', 'har'],
        hint: 'Introduce yourself and mention your experience: "Jeg har jobbet med..." or "Jeg har studert...".',
        modelAnswer: 'Jeg heter [navn] og har jobbet med markedsføring i tre år.',
        targetConceptId: 'past-perfect',
        errorTag: 'verb-tense',
      },
      {
        id: 'intervju-strengths',
        character: 'Hva vil du si er dine sterkeste sider?',
        characterEnglish: 'What would you say are your strongest qualities?',
        expectedKeywords: ['er', 'flink', 'god', 'sterk', 'side', 'løsningsorientert', 'strukturert', 'samarbeider'],
        hint: 'Name a strength: "Jeg er flink til å..." or "En av mine sterkeste sider er...".',
        modelAnswer: 'Jeg er løsningsorientert og god til å samarbeide med andre.',
        targetConceptId: 'formal-informal-register',
        errorTag: 'wrong-word-same-category',
      },
      {
        id: 'intervju-why',
        character: 'Hvorfor søker du akkurat denne stillingen?',
        characterEnglish: 'Why are you applying for this particular position?',
        expectedKeywords: ['fordi', 'interessert', 'liker', 'ønsker', 'bidra', 'utvikle', 'mulighet'],
        hint: 'Give a reason: "Jeg søker fordi jeg er interessert i..." or "Jeg ønsker å bidra med...".',
        modelAnswer: 'Jeg søker fordi jeg er interessert i å utvikle meg innen denne bransjen.',
        targetConceptId: 'discourse-markers',
        errorTag: 'meaning-misunderstood',
      },
      {
        id: 'intervju-close',
        character: 'Takk for det! Har du noen spørsmål til oss?',
        characterEnglish: 'Thank you for that! Do you have any questions for us?',
        expectedKeywords: ['lurer', 'om', 'spørsmål', 'vet', 'hva', 'når', 'oppstartsdato', 'teamet'],
        hint: 'Ask a question: "Jeg lurer på om..." or "Kan dere fortelle meg litt om...".',
        modelAnswer: 'Ja, jeg lurer på om dere kan fortelle litt om teamet jeg ville jobbe i.',
        targetConceptId: 'indirect-questions',
        errorTag: 'word-order',
      },
    ],
  },
  {
    id: 'restaurant-klage',
    title: 'Klage på restauranten',
    titleEnglish: 'Complaining at a restaurant',
    setting: "You ordered a meal at a Norwegian restaurant but there is a problem with your order. The waiter comes over.",
    characterName: 'Kelner',
    turns: [
      {
        id: 'klage-problem',
        character: 'Hei, er alt i orden?',
        characterEnglish: 'Hi, is everything all right?',
        expectedKeywords: ['nei', 'dessverre', 'bestilte', 'feil', 'kald', 'rå', 'problem', 'riktig'],
        hint: 'Point out the problem: "Jeg bestilte... men fikk..." or "Maten er...".',
        modelAnswer: 'Nei, dessverre. Jeg bestilte laksen, men maten er kald.',
        targetConceptId: 'phrasal-verbs',
        errorTag: 'preposition',
      },
      {
        id: 'klage-sorry',
        character: 'Beklager det. Vil du at vi varmer den opp, eller vil du ha noe annet?',
        characterEnglish: 'I apologise for that. Would you like us to heat it up, or would you prefer something else?',
        expectedKeywords: ['vil', 'gjerne', 'varme', 'opp', 'heller', 'annet', 'bytte', 'takk'],
        hint: 'Choose: ask them to heat it up or swap the dish.',
        modelAnswer: 'Jeg vil gjerne at dere varmer den opp, takk.',
        targetConceptId: 'phrasal-verbs',
        errorTag: 'preposition',
      },
      {
        id: 'klage-discount',
        character: 'Selvfølgelig. Og vi gir deg ti prosent rabatt på regningen.',
        characterEnglish: 'Of course. And we will give you a ten percent discount on the bill.',
        expectedKeywords: ['takk', 'tusen', 'setter', 'pris', 'hyggelig', 'snill', 'flott'],
        hint: 'Accept the gesture graciously: "Tusen takk, det setter jeg pris på."',
        modelAnswer: 'Tusen takk, det setter jeg veldig pris på.',
        targetConceptId: 'idiomatic-expressions',
        errorTag: 'meaning-misunderstood',
      },
      {
        id: 'klage-bill',
        character: 'Her er den nye regningen. Betaler du med kort?',
        characterEnglish: 'Here is the new bill. Are you paying by card?',
        expectedKeywords: ['ja', 'kort', 'vipps', 'kontant', 'betaler', 'her'],
        hint: 'Confirm payment method.',
        modelAnswer: 'Ja, jeg betaler med kort. Takk for hjelpen.',
        targetConceptId: 'formal-informal-register',
        errorTag: 'wrong-word-same-category',
      },
    ],
  },
]

const B2_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'debatt',
    title: 'Debattere et tema',
    titleEnglish: 'Debating a topic',
    setting: "You are in a panel discussion about whether Norwegian universities should offer more English-language programmes. Your debate partner opens.",
    characterName: 'Debattpartner',
    turns: [
      {
        id: 'debatt-thesis',
        character: 'Jeg mener at universiteter bør tilby flere engelskspråklige programmer for å tiltrekke internasjonale studenter. Hva mener du?',
        characterEnglish: 'I think universities should offer more English-language programmes to attract international students. What do you think?',
        expectedKeywords: ['mener', 'selv', 'om', 'likevel', 'derimot', 'enig', 'uenig', 'imidlertid'],
        hint: 'State your position with a concessive or contrastive marker: "Selv om... mener jeg at..." or "Jeg er delvis enig, men derimot...".',
        modelAnswer: 'Jeg er delvis enig, men jeg mener likevel at norsk bør forbli det primære undervisningsspråket.',
        targetConceptId: 'complex-argumentation',
        errorTag: 'word-order',
      },
      {
        id: 'debatt-counter',
        character: 'Men forskning viser jo at internasjonalisering styrker kvaliteten på utdanningen.',
        characterEnglish: 'But research shows that internationalisation strengthens the quality of education.',
        expectedKeywords: ['ifølge', 'hevdes', 'antyder', 'forskning', 'derimot', 'det', 'kan', 'argumenteres'],
        hint: 'Use academic hedging: "Det kan hevdes at..." or "Ifølge annen forskning...".',
        modelAnswer: 'Det kan hevdes at internasjonalisering er viktig, men det betyr ikke nødvendigvis at vi må bytte språk.',
        targetConceptId: 'academic-writing',
        errorTag: 'wrong-word-same-category',
      },
      {
        id: 'debatt-nuance',
        character: 'Hva med de studentene som ikke snakker norsk godt nok?',
        characterEnglish: 'What about the students who do not speak Norwegian well enough?',
        expectedKeywords: ['når', 'gjelder', 'de', 'studentene', 'følgelig', 'dermed', 'støtte', 'tilbud'],
        hint: 'Use anaphoric reference: "Når det gjelder disse studentene..." or "For sistnevnte gruppe...".',
        modelAnswer: 'Når det gjelder disse studentene, bør universitetet tilby norskopplæring, ikke fjerne norsk fra fagene.',
        targetConceptId: 'text-cohesion',
        errorTag: 'reading-parsing',
      },
      {
        id: 'debatt-close',
        character: 'Interessant. Kan du oppsummere ditt syn kort?',
        characterEnglish: 'Interesting. Can you summarise your view briefly?',
        expectedKeywords: ['kort', 'sagt', 'oppsummert', 'mener', 'viktig', 'norsk', 'bevare', 'internasjonalt'],
        hint: 'Summarise with a connector: "Kort sagt mener jeg at..." or "Oppsummert er jeg av den oppfatning at...".',
        modelAnswer: 'Kort sagt mener jeg at norsk bør bevares som undervisningsspråk, selv om internasjonal profil er verdifullt.',
        targetConceptId: 'stylistic-variation',
        errorTag: 'word-order',
      },
    ],
  },
  {
    id: 'husleie',
    title: 'Forhandle om husleie',
    titleEnglish: 'Negotiating rent',
    setting: "You are meeting your landlord to discuss renewing your lease. The rent has gone up significantly and you want to negotiate.",
    characterName: 'Utleier',
    turns: [
      {
        id: 'husleie-open',
        character: 'Jeg har tenkt å øke leien med to tusen kroner fra neste måned.',
        characterEnglish: 'I am planning to increase the rent by two thousand kroner from next month.',
        expectedKeywords: ['forstår', 'imidlertid', 'likevel', 'ønsker', 'diskutere', 'lurer', 'om', 'mulig'],
        hint: 'Acknowledge and push back politely: "Jeg forstår det, men jeg lurer på om det er mulig å...".',
        modelAnswer: 'Jeg forstår det, men jeg lurer på om det er mulig å diskutere dette nærmere.',
        targetConceptId: 'nuanced-register',
        errorTag: 'pronoun-choice',
      },
      {
        id: 'husleie-justify',
        character: 'Prisene i området har steget mye. Det er markedspris.',
        characterEnglish: 'Prices in the area have risen a lot. This is market rate.',
        expectedKeywords: ['selv', 'om', 'til', 'tross', 'for', 'har', 'bodd', 'vedlikeholdt', 'aldri'],
        hint: 'Use a concessive construction: "Selv om prisene har steget, har jeg vedlikeholdt leiligheten godt...".',
        modelAnswer: 'Selv om jeg forstår at prisene har steget, har jeg bodd her i tre år uten problemer og alltid betalt i tide.',
        targetConceptId: 'complex-argumentation',
        errorTag: 'word-order',
      },
      {
        id: 'husleie-propose',
        character: 'Hva foreslår du da?',
        characterEnglish: 'What do you propose then?',
        expectedKeywords: ['foreslår', 'tilbyr', 'kompromiss', 'tusen', 'økning', 'gradvis', 'halvparten'],
        hint: 'Make a counter-offer: "Jeg foreslår at vi..." or "Hva om vi møtes på halvparten?".',
        modelAnswer: 'Jeg foreslår at vi møtes på halvparten — én tusen kroner økning i stedet for to.',
        targetConceptId: 'professional-norwegian',
        errorTag: 'meaning-misunderstood',
      },
      {
        id: 'husleie-agree',
        character: 'Det kan vi kanskje se nærmere på. Jeg viser til kontrakten vår.',
        characterEnglish: 'We could perhaps look into that. I refer to our contract.',
        expectedKeywords: ['viser', 'henvendelse', 'takk', 'sette', 'pris', 'avtale', 'skriftlig', 'enige'],
        hint: 'Close professionally: "Tusen takk. Jeg setter pris på at vi kan finne en løsning."',
        modelAnswer: 'Tusen takk. Jeg setter pris på at vi kan finne en løsning, og jeg vil gjerne ha det skriftlig.',
        targetConceptId: 'professional-norwegian',
        errorTag: 'meaning-misunderstood',
      },
    ],
  },
  {
    id: 'kulturforskjell',
    title: 'Forklare en kulturforskjell',
    titleEnglish: 'Explaining a cultural difference',
    setting: "You are at a Norwegian dinner party. A Norwegian host asks about cultural differences between Norway and your home country.",
    characterName: 'Vert',
    turns: [
      {
        id: 'kultur-open',
        character: 'Jeg er nysgjerrig — hva synes du er den største kulturelle forskjellen mellom Norge og landet ditt?',
        characterEnglish: 'I am curious — what do you think is the biggest cultural difference between Norway and your country?',
        expectedKeywords: ['mener', 'synes', 'tror', 'forskjell', 'interessant', 'særlig', 'spesielt'],
        hint: 'Give a considered opinion and set up a contrast.',
        modelAnswer: 'Jeg synes den mest interessante forskjellen er den direkte kommunikasjonsstilen i Norge.',
        targetConceptId: 'nuanced-register',
        errorTag: 'pronoun-choice',
      },
      {
        id: 'kultur-explain',
        character: 'Kan du utdype det litt?',
        characterEnglish: 'Can you elaborate on that a bit?',
        expectedKeywords: ['hadde', 'visst', 'ville', 'ha', 'om', 'bare', 'for', 'eksempel', 'dermed'],
        hint: 'Use a counterfactual or hypothetical: "Hvis jeg hadde visst dette, ville jeg ha..." or give a concrete example.',
        modelAnswer: 'For eksempel: hvis jeg hadde visst at nordmenn foretrekker direkte tilbakemeldinger, ville jeg ha tilpasset meg raskere.',
        targetConceptId: 'subjunctive-mood',
        errorTag: 'verb-tense',
      },
      {
        id: 'kultur-compare',
        character: 'Interessant! Er det noe norsk du har tatt med deg hjem?',
        characterEnglish: 'Interesting! Is there something Norwegian you have taken home with you?',
        expectedKeywords: ['tatt', 'med', 'lært', 'adoptert', 'prøver', 'friluftsliv', 'åpenhet', 'direkte'],
        hint: 'Use a phrasal construction: "Jeg har tatt med meg..." or "Jeg prøver å...".',
        modelAnswer: 'Ja, jeg har tatt med meg friluftsliv-tankegangen — å tilbringe tid ute uansett vær.',
        targetConceptId: 'advanced-word-order',
        errorTag: 'word-order',
      },
      {
        id: 'kultur-reflect',
        character: 'Det er fint å høre. Hva vil du si til noen som skal flytte til Norge?',
        characterEnglish: 'That is nice to hear. What would you say to someone who is about to move to Norway?',
        expectedKeywords: ['ville', 'si', 'råd', 'anbefale', 'lære', 'norsk', 'åpen', 'ta', 'seg', 'tid'],
        hint: 'Give advice in a hypothetical frame: "Jeg ville si at..." or "Mitt råd ville være å...".',
        modelAnswer: 'Mitt råd ville være å lære norsk så fort som mulig og å være åpen for den direkte kommunikasjonsstilen.',
        targetConceptId: 'reported-speech-advanced',
        errorTag: 'verb-tense',
      },
    ],
  },
]

/** @deprecated use getRoleplayScenarios(level) instead */
export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = A1_SCENARIOS

/**
 * Returns the roleplay scenarios appropriate for the learner's CEFR level.
 * Falls back to A1 scenarios for A2 and unknown levels.
 */
export function getRoleplayScenarios(level: string): RoleplayScenario[] {
  if (level === 'B2') return B2_SCENARIOS
  if (level === 'B1') return B1_SCENARIOS
  return A1_SCENARIOS
}

/**
 * The CEFR level whose scenarios are ACTUALLY served for a learner level. A2
 * (and unknown) reuse the A1 set — exposing this lets the UI honestly disclose
 * below-level content instead of substituting silently (Operating Rule 6).
 */
export function getRoleplayContentLevel(level: string): string {
  if (level === 'B2') return 'B2'
  if (level === 'B1') return 'B1'
  if (level === 'A1') return 'A1'
  return 'A1' // A2 + unknown → A1 scenarios (no dedicated set yet)
}
