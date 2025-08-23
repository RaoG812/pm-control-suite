let created = false
let finance = false
let knowledge: {
  docs: { name: string; text: string }[]
  files: string[]
  code: { path: string; content: string }[]
} = {
  docs: [],
  files: [],
  code: []
}

export function markCreated(
  docs: { name: string; text: string }[],
  repoFiles: string[],
  repoCode: { path: string; content: string }[],
  _vuln: boolean,
  hasFinance = false
) {
  created = docs.length > 0 && repoFiles.length > 0
  finance = hasFinance
  knowledge = { docs, files: repoFiles, code: repoCode }
}

export function isCreated() {
  return created
}

export function hasFinanceData() {
  return finance
}

export function getKnowledge() {
  return knowledge
}
