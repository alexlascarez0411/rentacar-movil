import { expect, test } from '@playwright/test';

test('abre la aplicación en la pantalla de inicio de sesión', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText('Iniciar sesión')).toBeVisible();
});
