cf logs shiftbook-plugin --recent | grep -i "oauth\|error\|500"
cf logs shiftbook-srv-blue --recent | grep -i "oauth\|error\|403"
cf logs shiftbook-srv-green --recent | grep -i "oauth\|error\|403"
cf restart shiftbook-srv-blue
npm run build
mbt build && cf deploy mta_archives/shiftbook-srv_1.0.0.mtar
