
-- Fix impact_stats: only allow updates, not arbitrary inserts
DROP POLICY "System can update impact" ON public.impact_stats;
CREATE POLICY "All authenticated can update impact" ON public.impact_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Fix delivery_missions: only restaurants/system can create missions (via donation flow)
DROP POLICY "System can create missions" ON public.delivery_missions;
CREATE POLICY "Authenticated can create missions" ON public.delivery_missions FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'restaurant') OR public.has_role(auth.uid(), 'ngo')
);
