// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { LOG_RETENTION, PRIVACY_UPDATED, PROJECT_URL, PrivacyView } from './PrivacyView'

afterEach(cleanup)

test('shows the last-updated date, the access-log statement and the project link', () => {
  render(<PrivacyView onClose={() => {}} />)
  expect(screen.getByText(/Last updated/).querySelector('time')?.getAttribute('dateTime')).toBe(PRIVACY_UPDATED)
  expect(screen.getByText(/standard access logs/).textContent).toMatch(/IP address, the time, and which files/)
  const link = screen.getByRole('link', { name: 'GitHub' })
  expect(link.getAttribute('href')).toBe(PROJECT_URL)
  expect(link.getAttribute('target')).toBe('_blank')
  expect(link.getAttribute('rel')).toContain('noopener')
})

test('covers the microphone, recordings and browser storage', () => {
  render(<PrivacyView onClose={() => {}} />)
  for (const heading of ['Microphone', 'Session recordings', 'Saved in your browser']) {
    expect(screen.getByRole('heading', { name: heading })).toBeTruthy()
  }
  expect(screen.getByText(/never the audio/)).toBeTruthy()
  expect(screen.getByText(/clear this site's data/)).toBeTruthy()
})

test('Escape and Back close the page', () => {
  const onClose = vi.fn()
  render(<PrivacyView onClose={onClose} />)
  fireEvent.keyDown(window, { key: 'Escape' })
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('states how long access logs are kept, with no placeholder', () => {
  render(<PrivacyView onClose={() => {}} />)
  expect(LOG_RETENTION).toBeDefined()
  expect(screen.getByText(/standard access logs/).textContent).toContain(`They are kept for ${LOG_RETENTION}.`)
  expect(screen.queryByText(/not set/)).toBeNull()
})
