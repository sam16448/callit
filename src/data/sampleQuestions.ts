/**
 * 33 sample questions for the offline demo (no Supabase keys), 3 per board.
 * The live question bank is NOT in this public repo, so its answers can't be
 * looked up; these samples are separate and never used in ranked online runs.
 *
 * `teaser` is the opening words of `prompt`: what you see before calling.
 */
import type { Question } from '@/game/types';

export const SAMPLE_QUESTIONS: Question[] = [
  // Ball Knowledge (memes)
  { id: 'mem-01', category: 'memes', difficulty: 'easy', prompt: 'The 2023 trend asked how often men think about what?', teaser: 'The 2023 trend asked how often', options: ['The Ottoman Empire', 'The Roman Empire', 'Ancient Egypt', 'The Cold War'], answerIndex: 1 },
  { id: 'mem-02', category: 'memes', difficulty: 'easy', prompt: 'The 2023 "Grimace Shake" trend came from which fast-food chain?', teaser: 'The 2023 "Grimace Shake" trend', options: ['Burger King', 'Wendy’s', 'McDonald’s', 'Taco Bell'], answerIndex: 2 },
  { id: 'mem-03', category: 'memes', difficulty: 'hard', prompt: 'The viral "Hawk Tuah" street interview (2024) was filmed in which US city?', teaser: 'The viral "Hawk Tuah" street interview', options: ['Austin', 'Nashville', 'Miami', 'New Orleans'], answerIndex: 1 },

  // Trending Now (facts not used in the live bank)
  { id: 'now-01', category: 'now', difficulty: 'medium', prompt: 'Samsung\u2019s July 2026 Galaxy Unpacked (Z Fold8 Ultra) was held in which city?', teaser: 'Samsung\u2019s July 2026 Galaxy Unpacked', options: ['New York', 'London', 'Seoul', 'Paris'], answerIndex: 1 },
  { id: 'now-02', category: 'now', difficulty: 'hard', prompt: 'Google\u2019s $29 AirTag rival, launched in August 2026, is called…', teaser: 'Google\u2019s $29 AirTag rival', options: ['Pixel Find', 'Pixel Tag', 'Pixel Seek', 'Pixel Dot'], answerIndex: 1 },
  { id: 'now-03', category: 'now', difficulty: 'medium', prompt: 'The new 2D Metroid revealed at the September 2026 Nintendo Direct is called…', teaser: 'The new 2D Metroid revealed', options: ['Metroid Dread 2', 'Metroid Prime 5', 'Metroid Ravenous', 'Metroid Fusion Remake'], answerIndex: 2 },

  // Trends Vault
  { id: 'trd-01', category: 'trends', difficulty: 'easy', prompt: '"Very demure, very mindful" went viral in 2024 thanks to which creator?', teaser: '"Very demure, very mindful" went viral', options: ['Alix Earle', 'Jools Lebron', 'Brittany Broski', 'Keith Lee'], answerIndex: 1 },
  { id: 'trd-02', category: 'trends', difficulty: 'easy', prompt: '"Brat summer" (2024) came from an album by which artist?', teaser: '"Brat summer" (2024) came from', options: ['Chappell Roan', 'Sabrina Carpenter', 'Charli XCX', 'Billie Eilish'], answerIndex: 2 },
  { id: 'trd-03', category: 'trends', difficulty: 'medium', prompt: 'What is the name of the viral pygmy hippo from Thailand’s Khao Kheow Open Zoo?', teaser: 'What is the name of the viral pygmy hippo', options: ['Moo Deng', 'Moo Ping', 'Pesto', 'Moo Tun'], answerIndex: 0 },

  // Brainrot
  { id: 'brn-01', category: 'brainrot', difficulty: 'easy', prompt: 'Finish the brainrot: "Tung Tung Tung ___"', teaser: 'Finish the brainrot', options: ['Sahara', 'Sahur', 'Samba', 'Satoru'], answerIndex: 1 },
  { id: 'brn-02', category: 'brainrot', difficulty: 'medium', prompt: 'In Italian brainrot, Tralalero Tralala is a shark wearing what?', teaser: 'In Italian brainrot, Tralalero Tralala', options: ['A tutu', 'Sunglasses', 'Nike sneakers', 'A crown'], answerIndex: 2 },
  { id: 'brn-03', category: 'brainrot', difficulty: 'medium', prompt: '"Skibidi Toilet" started as a YouTube series by which creator?', teaser: '"Skibidi Toilet" started as', options: ['DaFuq!?Boom!', 'MrBeast', 'Kai Cenat', 'Markiplier'], answerIndex: 0 },

  // F1
  { id: 'f1-01', category: 'f1', difficulty: 'easy', prompt: 'Who won the 2024 Formula 1 Drivers’ Championship?', teaser: 'Who won the 2024 Formula 1', options: ['Lando Norris', 'Charles Leclerc', 'Max Verstappen', 'Lewis Hamilton'], answerIndex: 2 },
  { id: 'f1-02', category: 'f1', difficulty: 'easy', prompt: 'Lewis Hamilton moved to which team for the 2025 season?', teaser: 'Lewis Hamilton moved to', options: ['Ferrari', 'McLaren', 'Aston Martin', 'Red Bull'], answerIndex: 0 },
  { id: 'f1-03', category: 'f1', difficulty: 'medium', prompt: 'Which driver is famous for singing "Smooth Operator" over team radio?', teaser: 'Which driver is famous for singing', options: ['Daniel Ricciardo', 'Lando Norris', 'Carlos Sainz', 'Pierre Gasly'], answerIndex: 2 },

  // Football
  { id: 'fb-01', category: 'football', difficulty: 'medium', prompt: 'Who won the 2024 men’s Ballon d’Or?', teaser: 'Who won the 2024 men’s', options: ['Vinícius Júnior', 'Rodri', 'Jude Bellingham', 'Lamine Yamal'], answerIndex: 1 },
  { id: 'fb-02', category: 'football', difficulty: 'easy', prompt: 'Which country won Euro 2024?', teaser: 'Which country won', options: ['England', 'France', 'Spain', 'Germany'], answerIndex: 2 },
  { id: 'fb-03', category: 'football', difficulty: 'easy', prompt: 'Kylian Mbappé joined Real Madrid in 2024 from which club?', teaser: 'Kylian Mbappé joined Real Madrid', options: ['PSG', 'Monaco', 'Liverpool', 'Barcelona'], answerIndex: 0 },

  // Cricket
  { id: 'crk-01', category: 'cricket', difficulty: 'easy', prompt: 'India beat which team in the 2024 T20 World Cup final?', teaser: 'India beat which team in', options: ['Australia', 'England', 'South Africa', 'Afghanistan'], answerIndex: 2 },
  { id: 'crk-02', category: 'cricket', difficulty: 'easy', prompt: 'Which team won IPL 2024?', teaser: 'Which team won', options: ['Sunrisers Hyderabad', 'Kolkata Knight Riders', 'Royal Challengers Bengaluru', 'Chennai Super Kings'], answerIndex: 1 },
  { id: 'crk-03', category: 'cricket', difficulty: 'medium', prompt: 'Who took the boundary catch of David Miller in the last over of the 2024 T20 World Cup final?', teaser: 'Who took the boundary catch', options: ['Hardik Pandya', 'Rohit Sharma', 'Suryakumar Yadav', 'Axar Patel'], answerIndex: 2 },

  // Gaming
  { id: 'gam-01', category: 'gaming', difficulty: 'easy', prompt: 'GTA VI is set in a fictional version of which US state?', teaser: 'GTA VI is set in', options: ['California', 'Florida', 'Texas', 'Louisiana'], answerIndex: 1 },
  { id: 'gam-02', category: 'gaming', difficulty: 'medium', prompt: 'Which game won Game of the Year at The Game Awards 2024?', teaser: 'Which game won Game of the Year', options: ['Black Myth: Wukong', 'Final Fantasy VII Rebirth', 'Astro Bot', 'Elden Ring: Shadow of the Erdtree'], answerIndex: 2 },
  { id: 'gam-03', category: 'gaming', difficulty: 'easy', prompt: 'In A Minecraft Movie (2025), which line made cinema crowds go wild?', teaser: 'In A Minecraft Movie', options: ['"Flint and steel!"', '"Chicken jockey!"', '"The Nether!"', '"Ender pearl!"'], answerIndex: 1 },

  // Pop Culture
  { id: 'pop-01', category: 'pop-culture', difficulty: 'hard', prompt: 'Taylor Swift’s Eras Tour ended in December 2024 in which city?', teaser: 'Taylor Swift’s Eras Tour ended', options: ['Toronto', 'Vancouver', 'London', 'Miami'], answerIndex: 1 },
  { id: 'pop-02', category: 'pop-culture', difficulty: 'medium', prompt: 'Which song won Song of the Year at the 2025 Grammys?', teaser: 'Which song won Song of the Year', options: ['Espresso', 'Die With A Smile', 'Not Like Us', 'Birds of a Feather'], answerIndex: 2 },
  { id: 'pop-03', category: 'pop-culture', difficulty: 'easy', prompt: '"Barbenheimer" paired Barbie with which film?', teaser: '"Barbenheimer" paired Barbie', options: ['Dune', 'Oppenheimer', 'Killers of the Flower Moon', 'Past Lives'], answerIndex: 1 },

  // Anime
  { id: 'ani-01', category: 'anime', difficulty: 'easy', prompt: 'Who is the main character of Solo Leveling?', teaser: 'Who is the main character', options: ['Sung Jinwoo', 'Yuji Itadori', 'Tanjiro Kamado', 'Denji'], answerIndex: 0 },
  { id: 'ani-02', category: 'anime', difficulty: 'easy', prompt: '"Throughout Heaven and Earth, I alone am the honored one" is said by which character?', teaser: '"Throughout Heaven and Earth', options: ['Sukuna', 'Satoru Gojo', 'Madara Uchiha', 'Sosuke Aizen'], answerIndex: 1 },
  { id: 'ani-03', category: 'anime', difficulty: 'medium', prompt: 'Which anime has a main character nicknamed "Okarun"?', teaser: 'Which anime has a main character', options: ['Chainsaw Man', 'Dandadan', 'Spy x Family', 'Frieren'], answerIndex: 1 },

  // Tech & AI
  { id: 'ai-01', category: 'tech-ai', difficulty: 'medium', prompt: 'ChatGPT was released to the public in which month?', teaser: 'ChatGPT was released to the public', options: ['January 2022', 'November 2022', 'March 2023', 'June 2023'], answerIndex: 1 },
  { id: 'ai-02', category: 'tech-ai', difficulty: 'easy', prompt: 'DeepSeek, the AI lab that shook markets in January 2025, is from which country?', teaser: 'DeepSeek, the AI lab', options: ['South Korea', 'Japan', 'China', 'Singapore'], answerIndex: 2 },
  { id: 'ai-03', category: 'tech-ai', difficulty: 'easy', prompt: 'Apple’s AI features launched in 2024 are branded as what?', teaser: 'Apple’s AI features launched in 2024', options: ['Siri Pro', 'Apple Intelligence', 'iAI', 'Apple Mind'], answerIndex: 1 },
];
