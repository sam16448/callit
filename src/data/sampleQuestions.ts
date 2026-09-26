/**
 * 30 sample questions for the offline run, written for Call It (not taken from
 * Open Trivia DB), five per category across six categories. They power the
 * offline Mixed run and six offline category runs until Supabase is connected.
 *
 * `teaser` is always the opening words of `prompt`: what you see before calling.
 */
import type { Question } from '@/game/types';

export const SAMPLE_QUESTIONS: Question[] = [
  // General Knowledge
  { id: 'gen-01', category: 'general', difficulty: 'easy', prompt: 'How many sides does a hexagon have?', teaser: 'How many sides does', options: ['5', '6', '7', '8'], answerIndex: 1 },
  { id: 'gen-02', category: 'general', difficulty: 'medium', prompt: 'Which language has the most native speakers in the world?', teaser: 'Which language has the most', options: ['English', 'Spanish', 'Mandarin Chinese', 'Hindi'], answerIndex: 2 },
  { id: 'gen-03', category: 'general', difficulty: 'easy', prompt: 'Which colour do you get by mixing blue and yellow paint?', teaser: 'Which colour do you get by mixing', options: ['Green', 'Purple', 'Orange', 'Brown'], answerIndex: 0 },
  { id: 'gen-04', category: 'general', difficulty: 'easy', prompt: 'How many minutes are there in one full day?', teaser: 'How many minutes are there', options: ['1,240', '1,400', '2,400', '1,440'], answerIndex: 3 },
  { id: 'gen-05', category: 'general', difficulty: 'medium', prompt: 'The ancient city of Petra, carved into rose-red rock, is in which country?', teaser: 'The ancient city of Petra', options: ['Egypt', 'Jordan', 'Lebanon', 'Turkey'], answerIndex: 1 },

  // Science & Nature
  { id: 'sci-01', category: 'science', difficulty: 'easy', prompt: 'What is the chemical symbol for gold?', teaser: 'What is the chemical symbol', options: ['Ag', 'Au', 'Gd', 'Go'], answerIndex: 1 },
  { id: 'sci-02', category: 'science', difficulty: 'easy', prompt: 'Which gas do plants take in from the air for photosynthesis?', teaser: 'Which gas do plants take in', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answerIndex: 2 },
  { id: 'sci-03', category: 'science', difficulty: 'medium', prompt: 'How many bones are there in a typical adult human body?', teaser: 'How many bones are there', options: ['206', '208', '212', '198'], answerIndex: 0 },
  { id: 'sci-04', category: 'science', difficulty: 'easy', prompt: 'Which planet is closest to the Sun?', teaser: 'Which planet is closest', options: ['Venus', 'Mars', 'Earth', 'Mercury'], answerIndex: 3 },
  { id: 'sci-05', category: 'science', difficulty: 'medium', prompt: 'True or false: sound travels faster through water than through air.', teaser: 'True or false: sound travels', options: ['True', 'False'], answerIndex: 0 },

  // Geography
  { id: 'geo-01', category: 'geography', difficulty: 'medium', prompt: 'What is the capital city of Australia?', teaser: 'What is the capital city', options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answerIndex: 2 },
  { id: 'geo-02', category: 'geography', difficulty: 'easy', prompt: 'Which is the longest river in Africa?', teaser: 'Which is the longest river', options: ['Congo', 'Niger', 'Zambezi', 'Nile'], answerIndex: 3 },
  { id: 'geo-03', category: 'geography', difficulty: 'medium', prompt: 'Mount Kilimanjaro is in which country?', teaser: 'Mount Kilimanjaro is in', options: ['Kenya', 'Tanzania', 'Uganda', 'Ethiopia'], answerIndex: 1 },
  { id: 'geo-04', category: 'geography', difficulty: 'hard', prompt: 'Which Indian state has the longest coastline?', teaser: 'Which Indian state has the', options: ['Gujarat', 'Tamil Nadu', 'Andhra Pradesh', 'Maharashtra'], answerIndex: 0 },
  { id: 'geo-05', category: 'geography', difficulty: 'easy', prompt: 'True or false: the Sahara is the largest hot desert in the world.', teaser: 'True or false: the Sahara', options: ['True', 'False'], answerIndex: 0 },

  // History
  { id: 'his-01', category: 'history', difficulty: 'easy', prompt: 'In which year did India gain independence?', teaser: 'In which year did India', options: ['1945', '1947', '1950', '1942'], answerIndex: 1 },
  { id: 'his-02', category: 'history', difficulty: 'easy', prompt: 'Who was the first person to walk on the Moon?', teaser: 'Who was the first person', options: ['Buzz Aldrin', 'Yuri Gagarin', 'Neil Armstrong', 'Michael Collins'], answerIndex: 2 },
  { id: 'his-03', category: 'history', difficulty: 'medium', prompt: 'Which civilisation built Machu Picchu?', teaser: 'Which civilisation built', options: ['Aztec', 'Maya', 'Olmec', 'Inca'], answerIndex: 3 },
  { id: 'his-04', category: 'history', difficulty: 'medium', prompt: 'In which year did the Berlin Wall fall?', teaser: 'In which year did the', options: ['1991', '1985', '1989', '1987'], answerIndex: 2 },
  { id: 'his-05', category: 'history', difficulty: 'easy', prompt: 'Who was the first Prime Minister of India?', teaser: 'Who was the first Prime', options: ['Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Rajendra Prasad', 'Lal Bahadur Shastri'], answerIndex: 0 },

  // Film
  { id: 'fil-01', category: 'film', difficulty: 'easy', prompt: 'Which 1997 James Cameron film won 11 Academy Awards?', teaser: 'Which 1997 James Cameron film', options: ['Avatar', 'Titanic', 'The Abyss', 'Aliens'], answerIndex: 1 },
  { id: 'fil-02', category: 'film', difficulty: 'medium', prompt: 'The song "Naatu Naatu", which won the Oscar for Best Original Song, is from which film?', teaser: 'The song "Naatu Naatu"', options: ['Baahubali 2', 'Pushpa', 'KGF: Chapter 2', 'RRR'], answerIndex: 3 },
  { id: 'fil-03', category: 'film', difficulty: 'easy', prompt: 'Who directed the 1993 film Jurassic Park?', teaser: 'Who directed the 1993 film', options: ['James Cameron', 'George Lucas', 'Steven Spielberg', 'Ridley Scott'], answerIndex: 2 },
  { id: 'fil-04', category: 'film', difficulty: 'medium', prompt: "In the 1939 film The Wizard of Oz, what colour are Dorothy's slippers?", teaser: 'In the 1939 film The Wizard of Oz', options: ['Silver', 'Ruby red', 'Gold', 'Emerald green'], answerIndex: 1 },
  { id: 'fil-05', category: 'film', difficulty: 'easy', prompt: 'Which studio made Toy Story, the first fully computer-animated feature film?', teaser: 'Which studio made Toy Story', options: ['Pixar', 'DreamWorks', 'Blue Sky', 'Illumination'], answerIndex: 0 },

  // Tech
  { id: 'tec-01', category: 'tech', difficulty: 'easy', prompt: 'What does HTTP stand for?', teaser: 'What does HTTP', options: ['High Transfer Text Protocol', 'HyperText Transmission Process', 'HyperText Transfer Protocol', 'Hyperlink Text Transfer Protocol'], answerIndex: 2 },
  { id: 'tec-02', category: 'tech', difficulty: 'easy', prompt: 'Who co-founded Apple with Steve Jobs and Ronald Wayne?', teaser: 'Who co-founded Apple with', options: ['Bill Gates', 'Steve Wozniak', 'Paul Allen', 'Larry Page'], answerIndex: 1 },
  { id: 'tec-03', category: 'tech', difficulty: 'easy', prompt: 'How many bits are there in one byte?', teaser: 'How many bits are there', options: ['16', '32', '4', '8'], answerIndex: 3 },
  { id: 'tec-04', category: 'tech', difficulty: 'easy', prompt: 'Which language is used to style the look of web pages?', teaser: 'Which language is used to style', options: ['Python', 'SQL', 'CSS', 'HTML'], answerIndex: 2 },
  { id: 'tec-05', category: 'tech', difficulty: 'hard', prompt: 'True or false: the first public version of Python came out before the first version of Java.', teaser: 'True or false: the first public version', options: ['True', 'False'], answerIndex: 0 },
];
