// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { PRIVACY_UPDATED, PROJECT_URL, PrivacyView } from './PrivacyView'

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

const accessLogs = () => screen.getByTestId('access-logs').textContent

test('shows the log retention the operator configured', () => {
  render(<PrivacyView onClose={() => {}} operator={{ logRetention: 'up to 7 days' }} />)
  expect(accessLogs()).toContain("This site's operator states that they are kept for up to 7 days.")
})

test('says when the operator has not stated a retention', () => {
  render(<PrivacyView onClose={() => {}} />)
  expect(accessLogs()).toContain("This site's operator hasn't stated how long they are kept.")
  expect(screen.queryByTestId('operator-contact')).toBeNull()
})

test('a mailto or https contact is a link', () => {
  render(<PrivacyView onClose={() => {}} operator={{ operatorContact: 'mailto:admin@example.com' }} />)
  const link = screen.getByRole('link', { name: 'admin@example.com' })
  expect(link.getAttribute('href')).toBe('mailto:admin@example.com')
  cleanup()
  render(<PrivacyView onClose={() => {}} operator={{ operatorContact: 'https://example.com/contact' }} />)
  expect(screen.getByRole('link', { name: 'https://example.com/contact' }).getAttribute('rel')).toContain('noopener')
})

test('any other contact is plain text', () => {
  render(<PrivacyView onClose={() => {}} operator={{ operatorContact: 'Ask in the #music channel' }} />)
  const contact = screen.getByTestId('operator-contact')
  expect(contact.textContent).toContain('Ask in the #music channel')
  expect(contact.querySelector('a')).toBeNull()
})
