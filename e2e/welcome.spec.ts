import { test, expect } from '@playwright/test'

test.describe('Welcome Page', () => {
  test('shows welcome screen when no folder connected', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByRole('heading', { name: 'Dumpster Fire' })).toBeVisible()
    await expect(page.getByText('Where your messy thoughts go to burn bright')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Select Writing Folder' })).toBeVisible()
  })

  test('explains privacy benefits', async ({ page }) => {
    await page.goto('/')
    
    await expect(page.getByText(/Everything stays on your computer/)).toBeVisible()
    await expect(page.getByText(/Your data never leaves your device/)).toBeVisible()
  })
})
