export interface RoleplayTurn {
  id: string
  character: string          // Norwegian line
  characterEnglish: string   // English subtitle
  expectedKeywords: string[] // normalised lowercase — any one match = pass
  hint: string               // coaching tip on fallback
  modelAnswer: string        // "Prøv å si: ..." shown on retry
}

export interface RoleplayScenario {
  id: string
  title: string
  titleEnglish: string
  setting: string            // English context shown before start
  characterName: string
  turns: RoleplayTurn[]
}

export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
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
      },
      {
        id: 'size',
        character: 'Stor eller liten?',
        characterEnglish: 'Large or small?',
        expectedKeywords: ['stor', 'liten', 'medium'],
        hint: 'Choose a size.',
        modelAnswer: 'Stor, takk.',
      },
      {
        id: 'name',
        character: 'Hva er navnet ditt?',
        characterEnglish: 'What is your name?',
        expectedKeywords: ['heter', 'navn', 'jeg', 'er'],
        hint: 'Tell them your name.',
        modelAnswer: 'Jeg heter [ditt navn].',
      },
      {
        id: 'thanks',
        character: 'Det blir femti kroner. Ha en fin dag!',
        characterEnglish: "That's fifty kroner. Have a nice day!",
        expectedKeywords: ['takk', 'tusen', 'deg', 'også', 'ha'],
        hint: 'Say thank you.',
        modelAnswer: 'Takk! Ha det bra.',
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
      },
      {
        id: 'understand',
        character: 'Togstasjonen er rett frem og til venstre ved lyskrysset.',
        characterEnglish: 'The train station is straight ahead and left at the traffic light.',
        expectedKeywords: ['forstår', 'ok', 'takk', 'skjønner', 'frem', 'venstre'],
        hint: 'Confirm you understand.',
        modelAnswer: 'Ok, rett frem og til venstre. Takk!',
      },
      {
        id: 'howfar',
        character: 'Det tar omtrent fem minutter å gå.',
        characterEnglish: "It's about a five-minute walk.",
        expectedKeywords: ['takk', 'minutter', 'greit', 'bra', 'perfekt'],
        hint: 'Respond to the time estimate.',
        modelAnswer: 'Fem minutter — perfekt, takk så mye.',
      },
      {
        id: 'bye',
        character: 'Bare hyggelig! God tur!',
        characterEnglish: "You're welcome! Safe travels!",
        expectedKeywords: ['takk', 'ha', 'det', 'bra', 'hyggelig'],
        hint: 'Say goodbye.',
        modelAnswer: 'Takk! Ha det bra!',
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
      },
      {
        id: 'from',
        character: 'Hyggelig å møte deg! Hvor er du fra?',
        characterEnglish: 'Nice to meet you! Where are you from?',
        expectedKeywords: ['fra', 'bor', 'land', 'england', 'usa', 'norge', 'australia'],
        hint: 'Say where you are from.',
        modelAnswer: 'Jeg er fra England.',
      },
      {
        id: 'work',
        character: 'Spennende! Hva jobber du med her?',
        characterEnglish: 'Interesting! What will you be doing here?',
        expectedKeywords: ['jobber', 'arbeider', 'avdeling', 'prosjekt', 'design', 'kode', 'salg'],
        hint: 'Describe your role.',
        modelAnswer: 'Jeg jobber med design.',
      },
      {
        id: 'coffee',
        character: 'Kjempebra! Vil du ha en kopp kaffe?',
        characterEnglish: 'Great! Would you like a cup of coffee?',
        expectedKeywords: ['ja', 'takk', 'gjerne', 'kaffe', 'vil', 'ha'],
        hint: 'Accept or politely decline.',
        modelAnswer: 'Ja, gjerne! Tusen takk.',
      },
    ],
  },
]
