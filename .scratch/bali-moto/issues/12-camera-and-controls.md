# Grilling: camera and controls

Type: grilling
Status: resolved
Blocked by: 10
Map: ../map.md

## Question

How is the bike controlled and seen?

Decide the default camera (third-person chase, first-person, switchable), camera behaviour on lean and speed, keyboard and gamepad mappings, and whether there is a photo mode or free look.

## Answer

**Camera**: third-person chase only. No first-person view. Default offset about 6 m behind and 2.5 m above the scooter, smoothed with exponential lag on position and heading.

**Behaviour**: distance pulls back a little and field of view widens with speed; the camera rolls a few degrees with the bike's lean and lags the heading so corners swing; a short impact shake on collisions (from the handling ticket). The camera must never clip into buildings: pull in along the boom when a collider sits between camera and bike.

**Inputs**: keyboard only for v1. W/S or up/down for throttle and brake, A/D or left/right to steer, Shift for hard brake, R to reset onto the nearest road, mouse drag (held) for free look. No gamepad, no mouse steering.

**Free look**: mouse drag while held orbits the camera around the bike and snaps back on release. No photo mode.
