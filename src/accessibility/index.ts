import { AxeBuilder } from '@axe-core/playwright'
import type * as playwright from 'playwright'
import { split } from './splitter'
import { playRRWebEvents } from '../player'
import * as Sentry from "@sentry/node";
import { StorageProvider } from '../storage'

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>

interface ProblemAlternative {
  id: string
  message: string
}

interface ProblemElement {
  alternatives: ProblemAlternative[]
  element: string
  target: any
}

interface AccessiblityIssue {
  elements: ProblemElement[]
  help_url: string
  help: string
  id: string
  impact?: 'minor' | 'moderate' | 'serious' | 'critical' | null // axe.ImpactValue
  timestamp: number
}

async function runA11Y(storageProvider: StorageProvider, page: playwright.Page, filenames: string[]): Promise<AccessiblityIssue[]> {
  // Download, parse, and collect the relevant RRWeb events.
  const segments = await Sentry.startSpan({ name: "Download Segments" }, async () => {
    return await storageProvider.downloadFromFilenames(filenames)
  })

  console.time('split')
  const snapshots = split(segments)
  console.timeEnd('split')

  // Run in a loop evaluating each event.
  return await evaluateSnapshots(page, snapshots)
}

async function evaluateSnapshots(page: playwright.Page, events: any[]): Promise<AccessiblityIssue[]> {

  console.time('playRRWebEvents')
  await Sentry.startSpan({ name: "Play RRWeb" }, async () => { await playRRWebEvents(page, events) })
  console.timeEnd('playRRWebEvents')

  let timestamp = 0

  events.forEach((event) => {
    timestamp = Math.max(event.timestamp, timestamp);
  })

  return await runAxe(page, timestamp)
}

async function runAxe(page: playwright.Page, timestamp: any): Promise<AccessiblityIssue[]> {
  try {
    console.time('axe')

    const results = await Sentry.startSpan({ name: "Run Axe Core" }, async () => {
      return await new AxeBuilder({ page })
        .include('.rr-player__frame')
        .withTags(['wcag2a'])
        .disableRules([
          'frame-title',
          'page-has-heading-one',
          'landmark-one-main',
          "color-contrast",
          "duplicate-id-active",
          "duplicate-id-aria",
          "duplicate-id",
        ])
        .analyze()
    })
    console.timeEnd("axe");

    console.time('violations')
    const violations = processViolations(results, coerceTimestamp(timestamp))
    console.timeEnd('violations')
    return violations
  } catch (e) {
    Sentry.captureException(e, (scope) => {
      scope.setTag("page.url", page.url());
      return scope;
    });
    return []
  }
}

function coerceTimestamp(timestamp: any): number {
  const number = Number(timestamp)
  if (Number.isNaN(number)) {
    return 0
  } else {
    return number
  }
}

function processViolations(results: AxeResults, timestamp: number): AccessiblityIssue[] {
  return results.violations.map((result) => {
    return {
      elements: result.nodes.map((node) => {
        return {
          alternatives: node.any.map((issue) => {
            return {
              id: issue.id,
              message: issue.message
            }
          }),
          element: node.html,
          target: node.target
        }
      }),
      help_url: result.helpUrl,
      help: result.help,
      id: result.id,
      impact: result.impact,
      timestamp
    }
  })
}

export { runA11Y, type AccessiblityIssue, coerceTimestamp, processViolations }
