import type { Category, Message, MessageStore } from '@/types';

export const messages: MessageStore = {
  water: [
    {
      id: 'water-001',
      text: 'The rivers remember when they ran clear. Now they carry only silence and the weight of what we poured into them.',
      audioPath: '/audio/water-001.mp3',
    },
    {
      id: 'water-002',
      text: 'We watched the glaciers retreat like old friends leaving without saying goodbye. The meltwater took our memories with it.',
      audioPath: '/audio/water-002.mp3',
    },
    {
      id: 'water-003',
      text: 'The sea rose slowly at first, then all at once. Entire coastlines became stories we tell children who will never see them.',
      audioPath: '/audio/water-003.mp3',
    },
    {
      id: 'water-004',
      text: 'There was a time when rain tasted like nothing at all. Now every drop carries the bitterness of a sky we failed to protect.',
      audioPath: '/audio/water-004.mp3',
    },
  ],
  air: [
    {
      id: 'air-001',
      text: 'We used to look up and see stars. Now the sky is a pale curtain of haze, and the constellations are just old photographs.',
      audioPath: '/audio/air-001.mp3',
    },
    {
      id: 'air-002',
      text: 'Children here have never known the smell of clean morning air. They think the burning in their lungs is just how breathing feels.',
      audioPath: '/audio/air-002.mp3',
    },
    {
      id: 'air-003',
      text: 'The wind still blows, but it carries ash now instead of pollen. Spring is a word we keep in books, not on calendars.',
      audioPath: '/audio/air-003.mp3',
    },
    {
      id: 'air-004',
      text: 'They sealed the last pocket of mountain air in a glass jar at the museum. People line up for hours just to remember.',
      audioPath: '/audio/air-004.mp3',
    },
  ],
  fauna: [
    {
      id: 'fauna-001',
      text: 'The forests went quiet one species at a time. We did not notice until the silence became deafening.',
      audioPath: '/audio/fauna-001.mp3',
    },
    {
      id: 'fauna-002',
      text: 'My grandmother described birdsong to me once. I thought she was making it up. No sound could be that beautiful.',
      audioPath: '/audio/fauna-002.mp3',
    },
    {
      id: 'fauna-003',
      text: 'We have holograms of tigers now. They pace behind glass that is not there, in jungles that no longer exist.',
      audioPath: '/audio/fauna-003.mp3',
    },
    {
      id: 'fauna-004',
      text: 'The coral reefs turned white and then they turned to dust. An entire world beneath the waves, gone in a single generation.',
      audioPath: '/audio/fauna-004.mp3',
    },
  ],
  consumption: [
    {
      id: 'consumption-001',
      text: 'We buried our waste and called it progress. Now the earth pushes it back up, a slow reckoning we cannot ignore.',
      audioPath: '/audio/consumption-001.mp3',
    },
    {
      id: 'consumption-002',
      text: 'Every object you hold was once a mountain, a river, a living thing. We turned the world into products and the products into landfill.',
      audioPath: '/audio/consumption-002.mp3',
    },
    {
      id: 'consumption-003',
      text: 'The plastic outlasted everything. The civilizations that made it, the oceans that carried it, the creatures that swallowed it.',
      audioPath: '/audio/consumption-003.mp3',
    },
    {
      id: 'consumption-004',
      text: 'We had enough for everyone, but we wanted more than enough. That small difference cost us everything.',
      audioPath: '/audio/consumption-004.mp3',
    },
  ],
  energy: [
    {
      id: 'energy-001',
      text: 'The power plants stand like rusted cathedrals now. Monuments to an age that burned the future to light the present.',
      audioPath: '/audio/energy-001.mp3',
    },
    {
      id: 'energy-002',
      text: 'We knew the sun could power everything. We chose fire instead, because fire was familiar and the sun required change.',
      audioPath: '/audio/energy-002.mp3',
    },
    {
      id: 'energy-003',
      text: 'The pipelines cracked and the oil seeped into the soil like a slow poison. The land still has not forgiven us.',
      audioPath: '/audio/energy-003.mp3',
    },
    {
      id: 'energy-004',
      text: 'They called it an energy crisis, but it was really a courage crisis. The energy was always there, in the wind, in the light.',
      audioPath: '/audio/energy-004.mp3',
    },
  ],
};

export function getRandomMessage(category: Category): Message {
  const categoryMessages = messages[category];
  const index = Math.floor(Math.random() * categoryMessages.length);
  return categoryMessages[index];
}
