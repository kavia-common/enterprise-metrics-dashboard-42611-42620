import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * PUBLIC_INTERFACE
 * authGuard
 * Route guard that ensures the user is authenticated before activating a route.
 * If not authenticated, redirects to /login.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.isAuthenticated$.pipe(
    take(1),
    map((isAuth) => {
      if (isAuth) return true;
      return router.parseUrl('/login') as UrlTree;
    })
  );
};
