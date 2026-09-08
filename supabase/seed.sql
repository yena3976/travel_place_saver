insert into public.places (id,name,category,country,country_code,city,destination,area,google_locality,google_admin_area_level_1,google_admin_area_level_2,address,latitude,longitude,google_place_id,google_maps_url,status) values
('10000000-0000-0000-0000-000000000001','WYAH Art & Creative Space','Cafe','Indonesia','ID','Bali','Bali','Ubud',null,'Bali',null,'Jl. RSI Markandya II, Ubud',-8.4739,115.2551,'mock_wyah_ubud','https://maps.google.com/?q=WYAH+Art+Creative+Space+Bali','open'),
('10000000-0000-0000-0000-000000000002','Potato Head Beach Club','Bar','Indonesia','ID','Bali','Bali','Seminyak',null,'Bali',null,'Jl. Petitenget No.51B, Seminyak',-8.6795,115.1509,'mock_potato_head_bali','https://maps.google.com/?q=Potato+Head+Beach+Club+Bali','open'),
('10000000-0000-0000-0000-000000000003','Koffee Mameya','Cafe','Japan','JP','Tokyo','Tokyo','Shibuya','Tokyo','Tokyo',null,'4 Chome-15-3 Jingumae, Shibuya',35.6668,139.7102,'mock_koffee_mameya_tokyo','https://maps.google.com/?q=Koffee+Mameya+Tokyo','open')
on conflict (google_place_id) do update set name = excluded.name;

insert into public.saved_places (place_id,instagram_reel_url,normalized_reel_url,instagram_thumbnail,source_title,confidence)
select id, reel_url, reel_url, thumbnail, source_title, confidence
from public.places
join (values
  ('mock_wyah_ubud','https://www.instagram.com/reel/C8mockplace/','https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=700&q=80','Ubud cafe',0.94),
  ('mock_potato_head_bali','https://www.instagram.com/reel/potatohead/','https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=700&q=80','Bali beach club',0.92),
  ('mock_koffee_mameya_tokyo','https://www.instagram.com/reel/tokyocoffee/','https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=700&q=80','Tokyo coffee',0.91)
) as seed(google_place_id, reel_url, thumbnail, source_title, confidence)
using (google_place_id)
on conflict (place_id) do nothing;
