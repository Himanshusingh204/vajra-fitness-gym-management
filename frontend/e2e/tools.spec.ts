import { expect, test } from '@playwright/test';

test('BMI calculator gives 22.9 for 70 kg at 175 cm', async ({ page }) => {
  await page.goto('/tools/bmi-calculator');
  await page.getByLabel('Height (cm)').fill('175');
  await page.getByLabel('Weight (kg)').fill('70');
  await expect(page.getByText('22.9', { exact: true })).toBeVisible();
  await expect(page.getByText('Normal', { exact: true })).toBeVisible();
});

test('BMI calculator converts imperial input', async ({ page }) => {
  await page.goto('/tools/bmi-calculator');
  await page.getByLabel('Units').selectOption('imperial');
  await page.getByLabel('Height (ft)').fill('5');
  await page.getByLabel('Height (in)').fill('9');
  await page.getByLabel('Weight (lb)').fill('154');
  await expect(page.getByText('22.7', { exact: true })).toBeVisible();
});

test('BMI calculator ignores out-of-range input', async ({ page }) => {
  await page.goto('/tools/bmi-calculator');
  await page.getByLabel('Height (cm)').fill('20');
  await page.getByLabel('Weight (kg)').fill('70');
  await expect(page.getByText('Fill in the form')).toBeVisible();
});

test('calorie calculator gives the maintenance figure', async ({ page }) => {
  await page.goto('/tools/calorie-calculator');
  await page.getByLabel('Age (years)').fill('30');
  await page.getByLabel('Height (cm)').fill('180');
  await page.getByLabel('Weight (kg)').fill('80');
  // BMR 1,780 x 1.375 for light activity
  await expect(page.getByText('2,448 kcal')).toBeVisible();
});

test('one-rep max calculator averages Epley and Brzycki', async ({ page }) => {
  await page.goto('/tools/one-rep-max-calculator');
  await page.getByLabel(/Weight lifted/).fill('100');
  await page.getByLabel('Reps completed').fill('5');
  await expect(page.getByText('114.6')).toBeVisible();
  await expect(page.getByRole('row', { name: /80%/ })).toContainText('92.5 kg');
});

test('protein calculator shows a range in grams', async ({ page }) => {
  await page.goto('/tools/protein-calculator');
  await page.getByLabel('Weight (kg)').fill('70');
  await expect(page.getByText('84 to 112')).toBeVisible();
});

test('tools index links to all four calculators', async ({ page }) => {
  await page.goto('/tools');
  await expect(page.getByRole('main').getByRole('link')).toHaveCount(4);
});
