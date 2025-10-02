const BASE = 'https://dragon-ball-api.vercel.app/api';

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function getCharacters(page = 1, limit = 50) {
  const res = await fetch(`${BASE}/characters?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch characters');
  return unwrap(await res.json());
}

export async function getCharacter(id) {
  const res = await fetch(`${BASE}/characters/${id}`);
  if (!res.ok) throw new Error('Failed to fetch character');
  return res.json();
}

export async function getPlanets(limit = 50) {
  const res = await fetch(`${BASE}/planets?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch planets');
  return unwrap(await res.json());
}

export async function getPlanetWithCharacters(id) {
  const res = await fetch(`${BASE}/planets/${id}`);
  if (!res.ok) throw new Error('Failed to fetch planet');
  return res.json();
}
