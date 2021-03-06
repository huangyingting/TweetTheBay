# Tweet The Bay [![TravisCI Build Status](https://travis-ci.org/tweetthebay/TweetTheBay.svg?branch=master)](https://travis-ci.org/tweetthebay/TweetTheBay) [![CircleCI Build Status](https://circleci.com/gh/tweetthebay/TweetTheBay.png?style=shield&circle-token=:circle-token)](https://circleci.com/gh/tweetthebay/TweetTheBay) [![codecov](https://codecov.io/gh/tweetthebay/TweetTheBay/branch/master/graph/badge.svg)](https://codecov.io/gh/tweetthebay/TweetTheBay)

A Twitter mapping project by [Michael Altamirano][michael], [Nico Giraldo][nico], [Adrian Lobdill][adrian],  and [Elif Sezgin][elif].

[Live App][live]

[live]: http://www.tweetthebay.com/


[michael]: https://github.com/mjaltamirano
[adrian]: https://github.com/slolobdill44
[nico]: https://github.com/ngeeraldo
[elif]: https://github.com/elifsezgin


Wouldn’t you like to know where people are tweeting about tacos?

Twitter has some search features, but not a great way to geolocate tweets. Thanks to Tweet The Bay, you can now see a stream of tweets mapped out live as they are tweeted, or search by keyword in order to geolocate tweets from the last 7 days.

![livestream](./docs/tweetthebaylivestream.gif)

(Note: this gif compresses ~17 minutes of content into ~95 frames)

* **Frontend:** React.js/Redux/JQuery/Google Maps API/Material UI
* **Backend:** Ruby on Rails/Twitter API
* **Database:** PostgreSQL

## Features & Implementation

### Streaming

Tweet The Bay utilizes the [Twitter Streaming API][twitterlink] in order to provide a live feed of Tweets from the San Francisco Bay Area. Twitter's public streaming API comprises 1% of all of tweets (known as the "firehose").

[twitterlink]: https://dev.twitter.com/streaming/overview

A script establishes and maintains a long-term connection with the Twitter Streaming API, collecting all geolocated tweets that are within a given bounding box, set roughly to the coordinates of the San Francisco Bay Area. The coordinates used for this initial filter are between 36.9477-38.5288° N and 121.4099-123.6325° W.

Twitter's tweets are geolocated either by a tweet's actual location coordinates, or, if present, the "place" coordinates where the account was created, like "San Francisco" or "Chicago."" (For more detail, see: [Twitter Streaming API Request Parameters][locationparameters].) In order to most accurately depict geolocation for our livestream, we parse the tweets for those that have true coordinates associated with the tweet instead of just place. We also ran a second filter through our results to guarantee that the coordinates were located in the Bay Area, as sometimes tweets based in Southern California, Yosemite, and Tahoe made it through Twitter's location filter.

[locationparameters]:https://dev.twitter.com/streaming/overview/request-parameters#locations

At this point it was necessary to establish secondary filters to eliminate spam data. A large amount of the data we were receiving was job postings, but we also discovered a grouping of spam accounts located in the Farallon Islands, so those specific coordinates needed to be blacklisted, too. The code for all the filters is as follows:

```Ruby

stream.filter(locations: "-123.632497,36.9476967925,-121.4099121094,38.5288302896") do |tweet|
  if tweet.attrs[:coordinates]
    unless job_posting_blacklist.any? { |phrase| tweet.text.include?(phrase) } ||
      screen_name_blacklist.any? { |term| tweet.user.screen_name.include?(term) } ||
      farallon_islands_spam?(tweet.attrs[:coordinates]) ||
      not_bay_area_coordinates?(tweet.attrs[:coordinates])

```

Once through these filters, the tweets are then saved to a database. The livestream component of the website periodically queries the database for tweets that were created shortly before the user first visits the livestream page. By default, if there are no tweets yet, the page will offer up the last tweet in the database, providing the user with immediate feedback after switching from the search component to the streaming component, and alerting them that more tweets are incoming.

```Ruby
class Api::StreamsController < ApplicationController
  def index
    time_mount_utc = params[:timeNowUTC].to_i
    if Tweet.where("time_utc > #{time_mount_utc}").empty?
      @stream_tweets = Tweet.last(1)
    else
      @stream_tweets = Tweet
        .where("time_utc > #{time_mount_utc}")
        .last(250)
        .reverse
    end

    render :index
  end
end
```

### Search

When first entering search mode, the sidebar lists a few of the top currently trending topics in the Bay Area as a suggestion.

When searching, the app takes the bounding-box coordinates of the current map area and sends a request to the Twitter API to send back results within those coordinates. The request sent to Twitter is:

```Ruby
@tweets = @client.search("#{params[:query]}",
                        geocode: "#{params[:location][:lat]},#{params[:location][:lng]},#{params[:location][:radius]}mi",
                        result_type: "recent").attrs[:statuses]
```

As with streaming tweets, many results simply have a "place name" associated with them, and not coordinates. in order to filter these results out, our final tweets result array selects only those tweets with coordinates:

```Ruby
@geo_tweets = @tweets.select { |tweet| tweet[:coordinates] != nil || tweet[:place_coordinates] != nil}
```
Tweets with [:coordinates] contain the exact coordinates of where the tweet came from, whereas [:place_coordinates] provides a coordinates bounding-box for the tweet. Due to the limitations of the Twitter API, the search function can only return 100 results from the last 7 days of Twitter history. Since only about ~3% of tweets have exact geolocation data, sometimes only a handful of results can be mapped out.

Rails processes @geo_tweets and sends it as a View to Redux containers to be displayed in the map and sidebar. The sidebar populates with search results that can be clicked on to focus the map on that particular tweet.

### Maps

Maps is the backbone of the Tweet The Bay. Google Maps Javascript API is used for displaying the tweets with a location data on the map. For the tweets that has the coordinates data, the maps locates them according to the given coordinates. The tweets that have the location data such as address or city name are geocoded first and the resulting coordinates are marked as a pin for the tweet.

## Future directions for the project

### Expand streaming to more cities/areas

Due to limitations in the Twitter API, we currently only support streaming in the greater Bay Area. We would like to add more cities in the future, and have a dropdown menu from which a different city/area can be selected.

### Search by user/media

We would like to implement search for more than just keywords. If a Twitter account could be searched for, users could see their own tweets mapped out. If we implemented a search for media, we would display that particular media in the sidebar, and support playing videos in the modal. Additionally, the livestream component of the website could save pointers to these media to the database, allowing us to, for example, set up a "Photo Map" portion of the website that display only pictures taken in certain locations.

### Twitter authentication and tweeting from our own app

It would be awesome if a user could log in to Twitter within our app, send a tweet out, and see it mapped live. One limitation to the Twitter Streaming API is that it only grabs ~1% of all tweets being sent out, so an exact implementation would probably require enterprise-level access to the Twitter API.
