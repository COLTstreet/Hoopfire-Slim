(function() {
  'use strict';

  angular.module('app').component('nba', {
    controller: NbaController,
    controllerAs: 'vm',
    templateUrl: 'app/nba/nba.view.html',
  });

  /** @ngInject */
  function NbaController($log, $translate, SAMPLE_CONSTANT, $timeout, $q) {
    var vm = this;

    //Variables
    vm.nbaTeams = [];
    vm.selectedItem = null;
    vm.searchTextLeft = null;
    vm.searchTextRight = null;
    vm.homeLeft = true;
    vm.neutral = false;
    vm.selectedMode = 'md-fling';
    vm.selectedDirection = 'left';
    vm.isOpen = false;
    vm.showProgress = false;

    //Functions
    vm.querySearch = querySearch;
    vm.leftTeamChange = leftTeamChange
    vm.rightTeamChange = rightTeamChange
    vm.toggleHomeCourt = toggleHomeCourt;
    vm.removeMatchup = removeMatchup;
    vm.addMatchup = addMatchup;
    vm.getTodaysSchedule = getTodaysSchedule;

    init();

    /**
     * Left team change function
     */
    function leftTeamChange(team) {
        if(team) {
            if(team.fields.team.stringValue.length > 14) {
                vm.prettyLeft = team.fields.team.stringValue.substring(0,12)+"...";
            } else {
                vm.prettyLeft = team.fields.team.stringValue;
            }
            calculateOdds();
        }
    }

    /**
     * Right team change function
     */
    function rightTeamChange(team) {
        if(team) {
            if(team.fields.team.stringValue.length > 14) {
                vm.prettyRight = team.fields.team.stringValue.substring(0,12)+"...";
            } else {
              vm.prettyRight = team.fields.team.stringValue;
            }
          calculateOdds();
        }
    }


    /**
     * Search for teams
     */
    function querySearch (query) {
      var results = query ? vm.nbaTeams.filter( createFilterFor(query) ) : vm.nbaTeams;
      return results;
    }

    /**
     * Create filter function for a query string
     */
    function createFilterFor(query) {
      var lowercaseQuery = query.toLowerCase();

      return function filterFn(state) {
        return (state.fields.team.stringValue.toLowerCase().indexOf(lowercaseQuery) === 0);
      };

    }

    /**
     * Remove matchup from table
     */
    function removeMatchup(i) {
        vm.matchups.data.splice(i, 1);
    }

    /**
     * Toggle Home court on and off for teams
     */
    function toggleHomeCourt(side){
      if(side === "left") {
        if(!vm.homeLeft) {
          $("#homeLeft").toggleClass("home-icon-color");
          vm.homeLeft = true;
          $("#homeRight").toggleClass("home-icon-color");
          vm.homeRight = false;

          calculateOdds();
        }
      } else if(side === "right") {
        if(!vm.homeRight) {
          $("#homeRight").toggleClass("home-icon-color");
          vm.homeRight = true;
          $("#homeLeft").toggleClass("home-icon-color");
          vm.homeLeft = false;

          calculateOdds();
        }
      }
    }

    function calculateAverages() {
        vm.nbaTeams.forEach(function (element) {
            if(element.fields.team.stringValue === "League Average"){
                vm.avgPos = element.fields.pace.stringValue;
                vm.avgOff = element.fields.oRtg.stringValue;
            }
        });
    }

    function calculateOdds() {
      if(vm.selectedTeamLeft && vm.selectedTeamRight){
        var awayTeam, homeTeam;
        var adv = .010;
        if(vm.homeLeft) {
            homeTeam = vm.selectedTeamLeft;
            awayTeam = vm.selectedTeamRight;
        } else if(vm.homeRight) {
            homeTeam = vm.selectedTeamRight;
            awayTeam = vm.selectedTeamLeft;
        }

        var adjHomeOff = Number(homeTeam.fields.oRtg.stringValue) + Number(homeTeam.fields.oRtg.stringValue) * adv;
        var adjHomeDef = Number(homeTeam.fields.dRtg.stringValue) - Number(homeTeam.fields.dRtg.stringValue) * adv;

        var adjAwayOff = Number(awayTeam.fields.oRtg.stringValue) - Number(awayTeam.fields.oRtg.stringValue) * adv;
        var adjAwayDef = Number(awayTeam.fields.dRtg.stringValue) + Number(awayTeam.fields.dRtg.stringValue) * adv;
        
        var pythExp = 10.25;
        var adjHomePyth = Math.pow(adjHomeOff, pythExp) / (Math.pow(adjHomeOff, pythExp) + Math.pow(adjHomeDef, pythExp));
        var adjAwayPyth = Math.pow(adjAwayOff, pythExp) / (Math.pow(adjAwayOff, pythExp) + Math.pow(adjAwayDef, pythExp));

        var homeWinChance = (adjHomePyth - adjHomePyth * adjAwayPyth) / (adjHomePyth + adjAwayPyth - 2 * adjHomePyth * adjAwayPyth);
        vm.homeWinChance = homeWinChance * 100;
        vm.awayWinChance = (1 - homeWinChance) * 100;
        vm.homeWinChance = vm.homeWinChance.toFixed(0);
        vm.awayWinChance = vm.awayWinChance.toFixed(0);

        var adjPos = ((awayTeam.fields.pace.stringValue / vm.avgPos) * (homeTeam.fields.pace.stringValue / vm.avgPos)) * vm.avgPos;

        var awayScoreDecimal = (((adjAwayOff / vm.avgOff) * (adjHomeDef / vm.avgOff)) * (vm.avgOff) * (adjPos / 100));
        vm.awayScore = Number(awayScoreDecimal.toFixed(0));
        var homeScoreDecimal = (((adjHomeOff / vm.avgOff) * (adjAwayDef / vm.avgOff)) * (vm.avgOff) * (adjPos / 100));
        vm.homeScore = Number(homeScoreDecimal.toFixed(0));
        
        var decSpread = Math.abs(homeScoreDecimal - (awayScoreDecimal));
        
        if (homeScoreDecimal > awayScoreDecimal) {
          vm.spread = "-" + (Math.round(decSpread * 2) / 2).toFixed(1);
          vm.winner = homeTeam;
          vm.confidenceScore = vm.homeWinChance;
        } else {
          vm.spread = "-" + (Math.round(decSpread * 2) / 2).toFixed(1);
          vm.winner = awayTeam;
          vm.confidenceScore = vm.awayWinChance;
        }
        
        if(vm.homeLeft) {
            vm.leftScore = vm.homeScore;
            vm.rightScore = vm.awayScore;
            if(homeScoreDecimal > awayScoreDecimal) {
                vm.leftWinner = true;
                vm.rightWinner = false;
            } else {
                vm.leftWinner = false;
                vm.rightWinner = true;
            }
        } else if(vm.homeRight) {
            vm.leftScore = vm.awayScore;
            vm.rightScore = vm.homeScore;
            if(homeScoreDecimal > awayScoreDecimal) {
                vm.leftWinner = false;
                vm.rightWinner = true;
            } else {
                vm.leftWinner = true;
                vm.rightWinner = false;
            }
        }
        
        
        vm.overUnder = (awayScoreDecimal + homeScoreDecimal).toFixed(2);
        vm.totalPoints = vm.homeScore + vm.awayScore;
      }
    }

    function addMatchup(gameTime) {
        var matchup = {
            "leftTeam": vm.selectedTeamLeft.fields.team.stringValue,
            "leftScore": { "value": vm.leftScore },
            "spread": { "team": vm.winner.fields.team.stringValue, "value": vm.spread },
            "totalPoints": { "value": vm.totalPoints},
            "rightScore": { "value": vm.rightScore },
            "rightTeam": vm.selectedTeamRight.fields.team.stringValue,
            "confidence": { "value": vm.confidenceScore },
            "gameTime": "User Generated",
            "remove": ""
        };

        if(vm.neutral){
            matchup.neutral = "Neutral Court"
        } else {
            if(vm.homeLeft) {
                matchup.neutral = "@ " + vm.selectedTeamLeft.fields.team.stringValue;
            } else {
                matchup.neutral = "@ " + vm.selectedTeamRight.fields.team.stringValue;
            }
        }

        if(gameTime) {
            matchup.gameTime = gameTime;
        }

        vm.matchups.data.push(matchup);
    }

     /**
     * Function to retrieve the NBA schedule for today
     */
    function getTodaysSchedule() {
        vm.showProgress = true;
        var date = new Date();
        date.setDate(date.getDate());
        date.setHours(0,0,0,0);

        var structuredQuery = {
            "structuredQuery": {
                "where" : {
                    "fieldFilter" : { 
                        "field": {"fieldPath": "date"}, 
                        "op":"EQUAL", 
                        "value": {"stringValue": date.toISOString()}
                    }
                },
                "from": [{"collectionId": "nba-schedule"}]
            }
        }

        $.ajax({
            url : "https://firestore.googleapis.com/v1beta1/projects/hoopfire-api/databases/(default)/documents:runQuery?",
            key: "a9d366bac3abc2f55bca7a4fa84512befed452f2",
            type: "POST",
            dataType : "json",
            data: JSON.stringify(structuredQuery),
            contentType: "application/json",
            success : function(parsed_json) {
                calculateTodaysGames(parsed_json);
                vm.showProgress = false;
            }
        });
    }

    /**
     * Grab Home and Away teams
     * Calculate each game return from the schedule
     */
    function calculateTodaysGames(data) {
        var homeTeam, awayTeam, gameTime, todaysMatchups = [];
        vm.toggleHomeCourt('left');
        data.forEach(function(matchup) {
            vm.nbaTeams.forEach(function(team) {
                if(team.fields.team.stringValue === matchup.document.fields.home.stringValue) {
                    homeTeam = team;
                }
                if(team.fields.team.stringValue === matchup.document.fields.away.stringValue) {
                    awayTeam = team;
                }
                gameTime = matchup.document.fields.start.stringValue;
            });
            if(homeTeam && awayTeam) {
                todaysMatchups.push([homeTeam, awayTeam, gameTime]);
            }
        });

        if(todaysMatchups.length > 0) {
            todaysMatchups.forEach(function(matchup) {
                vm.selectedTeamLeft = matchup[0];
                vm.selectedTeamRight = matchup[1];
    
                calculateOdds();
                vm.addMatchup(matchup[2]);
            });
        }
    }

    /**
     * Init page
     * Make NCAA Data Calls
     */
    function init() {
        //NBA Data Call
        $.ajax({
            url : "https://firestore.googleapis.com/v1beta1/projects/hoopfire-api/databases/(default)/documents/nba-teams?pageSize=50&key=a9d366bac3abc2f55bca7a4fa84512befed452f2",
            dataType : "jsonp",
            success : function(parsed_json) {
                vm.nbaTeams = parsed_json.documents;
                calculateAverages();
            }
        });

        vm.selected = [];
        vm.currentNav = "nba";

        vm.query = {
            order: 'name',
            limit: 5,
            page: 1
        };

        vm.matchups = {
            "data": []
        };

        //vm.nbaTeams = [{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Atlanta Hawks","fields":{"oRtg":{"stringValue":"106.5"},"rank":{"stringValue":"27"},"losses":{"stringValue":"41"},"team":{"stringValue":"Atlanta Hawks"},"wins":{"stringValue":"18"},"pace":{"stringValue":"97.1"},"dRtg":{"stringValue":"110.8"}},"createTime":"2018-02-07T19:45:54.097634Z","updateTime":"2018-02-15T16:57:05.742351Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Boston Celtics","fields":{"rank":{"stringValue":"5"},"oRtg":{"stringValue":"106.8"},"losses":{"stringValue":"19"},"team":{"stringValue":"Boston Celtics"},"pace":{"stringValue":"96.0"},"wins":{"stringValue":"40"},"dRtg":{"stringValue":"103.2"}},"createTime":"2018-02-07T19:45:54.106371Z","updateTime":"2018-02-15T16:57:05.743177Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Brooklyn Nets","fields":{"oRtg":{"stringValue":"105.7"},"rank":{"stringValue":"25"},"losses":{"stringValue":"40"},"team":{"stringValue":"Brooklyn Nets"},"wins":{"stringValue":"19"},"pace":{"stringValue":"98.8"},"dRtg":{"stringValue":"110.0"}},"createTime":"2018-02-07T19:45:54.085556Z","updateTime":"2018-02-15T16:57:05.728082Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Charlotte Hornets","fields":{"wins":{"stringValue":"24"},"pace":{"stringValue":"98.2"},"dRtg":{"stringValue":"108.0"},"rank":{"stringValue":"19"},"oRtg":{"stringValue":"107.4"},"losses":{"stringValue":"33"},"team":{"stringValue":"Charlotte Hornets"}},"createTime":"2018-02-07T19:45:54.101065Z","updateTime":"2018-02-15T16:57:05.728242Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Chicago Bulls","fields":{"rank":{"stringValue":"28"},"oRtg":{"stringValue":"104.1"},"losses":{"stringValue":"37"},"team":{"stringValue":"Chicago Bulls"},"pace":{"stringValue":"98.0"},"wins":{"stringValue":"20"},"dRtg":{"stringValue":"110.0"}},"createTime":"2018-02-07T19:45:54.085353Z","updateTime":"2018-02-15T16:57:05.721416Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Cleveland Cavaliers","fields":{"rank":{"stringValue":"16"},"oRtg":{"stringValue":"112.3"},"losses":{"stringValue":"22"},"team":{"stringValue":"Cleveland Cavaliers"},"pace":{"stringValue":"97.7"},"wins":{"stringValue":"34"},"dRtg":{"stringValue":"112.1"}},"createTime":"2018-02-07T19:45:54.099276Z","updateTime":"2018-02-15T16:57:05.740158Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Dallas Mavericks","fields":{"rank":{"stringValue":"21"},"oRtg":{"stringValue":"106.8"},"losses":{"stringValue":"40"},"team":{"stringValue":"Dallas Mavericks"},"pace":{"stringValue":"95.2"},"wins":{"stringValue":"18"},"dRtg":{"stringValue":"109.3"}},"createTime":"2018-02-07T19:45:54.108304Z","updateTime":"2018-02-15T16:57:05.722178Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Denver Nuggets","fields":{"pace":{"stringValue":"96.6"},"wins":{"stringValue":"31"},"dRtg":{"stringValue":"109.7"},"rank":{"stringValue":"11"},"oRtg":{"stringValue":"110.6"},"losses":{"stringValue":"26"},"team":{"stringValue":"Denver Nuggets"}},"createTime":"2018-02-07T19:45:54.107833Z","updateTime":"2018-02-15T16:57:05.705011Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Detroit Pistons","fields":{"team":{"stringValue":"Detroit Pistons"},"wins":{"stringValue":"28"},"pace":{"stringValue":"96.3"},"dRtg":{"stringValue":"107.3"},"rank":{"stringValue":"17"},"oRtg":{"stringValue":"107.2"},"losses":{"stringValue":"29"}},"createTime":"2018-02-07T19:45:54.087564Z","updateTime":"2018-02-15T16:57:05.720361Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Golden State Warriors","fields":{"rank":{"stringValue":"2"},"oRtg":{"stringValue":"114.6"},"losses":{"stringValue":"13"},"team":{"stringValue":"Golden State Warriors"},"wins":{"stringValue":"41"},"pace":{"stringValue":"100.3"},"dRtg":{"stringValue":"107.3"}},"createTime":"2018-02-07T19:45:54.122108Z","updateTime":"2018-02-07T19:45:54.122108Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Houston Rockets","fields":{"pace":{"stringValue":"98.2"},"wins":{"stringValue":"44"},"dRtg":{"stringValue":"106.9"},"rank":{"stringValue":"2"},"oRtg":{"stringValue":"115.7"},"losses":{"stringValue":"13"},"team":{"stringValue":"Houston Rockets"}},"createTime":"2018-02-15T16:57:05.728442Z","updateTime":"2018-02-15T16:57:05.728442Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Indiana Pacers","fields":{"rank":{"stringValue":"14"},"oRtg":{"stringValue":"110.5"},"losses":{"stringValue":"25"},"team":{"stringValue":"Indiana Pacers"},"pace":{"stringValue":"96.3"},"wins":{"stringValue":"33"},"dRtg":{"stringValue":"109.1"}},"createTime":"2018-02-07T19:45:54.107484Z","updateTime":"2018-02-15T16:57:05.749893Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/League Average","fields":{"wins":{"stringValue":""},"pace":{"stringValue":"97.1"},"dRtg":{"stringValue":"108.4"},"oRtg":{"stringValue":"108.4"},"rank":{"stringValue":""},"losses":{"stringValue":""},"team":{"stringValue":"League Average"}},"createTime":"2018-02-07T19:45:54.295736Z","updateTime":"2018-02-15T16:57:05.713080Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Los Angeles Clippers","fields":{"rank":{"stringValue":"13"},"oRtg":{"stringValue":"109.5"},"losses":{"stringValue":"26"},"team":{"stringValue":"Los Angeles Clippers"},"pace":{"stringValue":"98.4"},"wins":{"stringValue":"30"},"dRtg":{"stringValue":"108.6"}},"createTime":"2018-02-07T19:45:54.098861Z","updateTime":"2018-02-15T16:57:05.729427Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Los Angeles Lakers","fields":{"rank":{"stringValue":"23"},"oRtg":{"stringValue":"105.1"},"losses":{"stringValue":"33"},"team":{"stringValue":"Los Angeles Lakers"},"pace":{"stringValue":"100.7"},"wins":{"stringValue":"23"},"dRtg":{"stringValue":"107.9"}},"createTime":"2018-02-07T19:45:54.089281Z","updateTime":"2018-02-15T16:57:05.720254Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Memphis Grizzlies","fields":{"pace":{"stringValue":"93.8"},"wins":{"stringValue":"18"},"dRtg":{"stringValue":"109.4"},"rank":{"stringValue":"24"},"oRtg":{"stringValue":"105.5"},"losses":{"stringValue":"38"},"team":{"stringValue":"Memphis Grizzlies"}},"createTime":"2018-02-07T19:45:54.099956Z","updateTime":"2018-02-15T16:57:05.705717Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Miami Heat","fields":{"rank":{"stringValue":"20"},"oRtg":{"stringValue":"105.6"},"losses":{"stringValue":"28"},"team":{"stringValue":"Miami Heat"},"wins":{"stringValue":"30"},"pace":{"stringValue":"94.9"},"dRtg":{"stringValue":"106.5"}},"createTime":"2018-02-07T19:45:54.095620Z","updateTime":"2018-02-15T16:57:05.719555Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Milwaukee Bucks","fields":{"team":{"stringValue":"Milwaukee Bucks"},"pace":{"stringValue":"95.4"},"wins":{"stringValue":"32"},"dRtg":{"stringValue":"108.7"},"rank":{"stringValue":"18"},"oRtg":{"stringValue":"108.9"},"losses":{"stringValue":"24"}},"createTime":"2018-02-07T19:45:54.085469Z","updateTime":"2018-02-15T16:57:05.743477Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Minnesota Timberwolves","fields":{"rank":{"stringValue":"6"},"oRtg":{"stringValue":"113.9"},"losses":{"stringValue":"25"},"team":{"stringValue":"Minnesota Timberwolves"},"wins":{"stringValue":"35"},"pace":{"stringValue":"95.5"},"dRtg":{"stringValue":"110.9"}},"createTime":"2018-02-07T19:45:54.118628Z","updateTime":"2018-02-15T16:57:05.719468Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/New Orleans Pelicans","fields":{"pace":{"stringValue":"99.9"},"wins":{"stringValue":"31"},"dRtg":{"stringValue":"109.4"},"rank":{"stringValue":"15"},"oRtg":{"stringValue":"109.6"},"losses":{"stringValue":"26"},"team":{"stringValue":"New Orleans Pelicans"}},"createTime":"2018-02-07T19:45:54.089800Z","updateTime":"2018-02-15T16:57:05.743373Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/New York Knicks","fields":{"team":{"stringValue":"New York Knicks"},"wins":{"stringValue":"23"},"pace":{"stringValue":"96.5"},"dRtg":{"stringValue":"109.0"},"oRtg":{"stringValue":"106.5"},"rank":{"stringValue":"22"},"losses":{"stringValue":"36"}},"createTime":"2018-02-07T19:45:54.187810Z","updateTime":"2018-02-15T16:57:05.723264Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Oklahoma City Thunder","fields":{"team":{"stringValue":"Oklahoma City Thunder"},"wins":{"stringValue":"33"},"pace":{"stringValue":"96.1"},"dRtg":{"stringValue":"106.7"},"rank":{"stringValue":"4"},"oRtg":{"stringValue":"110.2"},"losses":{"stringValue":"26"}},"createTime":"2018-02-07T19:45:54.108860Z","updateTime":"2018-02-15T16:57:05.735880Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Orlando Magic","fields":{"pace":{"stringValue":"98.5"},"wins":{"stringValue":"18"},"dRtg":{"stringValue":"111.2"},"rank":{"stringValue":"26"},"oRtg":{"stringValue":"106.9"},"losses":{"stringValue":"39"},"team":{"stringValue":"Orlando Magic"}},"createTime":"2018-02-07T19:45:54.105987Z","updateTime":"2018-02-15T16:57:05.702974Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Philadelphia 76ers","fields":{"rank":{"stringValue":"7"},"oRtg":{"stringValue":"107.6"},"losses":{"stringValue":"25"},"team":{"stringValue":"Philadelphia 76ers"},"pace":{"stringValue":"99.2"},"wins":{"stringValue":"30"},"dRtg":{"stringValue":"105.6"}},"createTime":"2018-02-07T19:45:54.100164Z","updateTime":"2018-02-15T16:57:05.735972Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Phoenix Suns","fields":{"team":{"stringValue":"Phoenix Suns"},"pace":{"stringValue":"99.5"},"wins":{"stringValue":"18"},"dRtg":{"stringValue":"113.2"},"rank":{"stringValue":"30"},"oRtg":{"stringValue":"104.2"},"losses":{"stringValue":"41"}},"createTime":"2018-02-07T19:45:54.113958Z","updateTime":"2018-02-15T16:57:05.730448Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Portland Trail Blazers","fields":{"pace":{"stringValue":"96.4"},"wins":{"stringValue":"32"},"dRtg":{"stringValue":"107.3"},"rank":{"stringValue":"12"},"oRtg":{"stringValue":"108.4"},"losses":{"stringValue":"26"},"team":{"stringValue":"Portland Trail Blazers"}},"createTime":"2018-02-07T19:45:54.084506Z","updateTime":"2018-02-15T16:57:05.733883Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Sacramento Kings","fields":{"rank":{"stringValue":"29"},"oRtg":{"stringValue":"103.5"},"losses":{"stringValue":"39"},"team":{"stringValue":"Sacramento Kings"},"pace":{"stringValue":"95.2"},"wins":{"stringValue":"18"},"dRtg":{"stringValue":"111.9"}},"createTime":"2018-02-07T19:45:54.097932Z","updateTime":"2018-02-15T16:57:05.731431Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/San Antonio Spurs","fields":{"team":{"stringValue":"San Antonio Spurs"},"wins":{"stringValue":"35"},"pace":{"stringValue":"94.6"},"dRtg":{"stringValue":"104.1"},"rank":{"stringValue":"8"},"oRtg":{"stringValue":"107.4"},"losses":{"stringValue":"24"}},"createTime":"2018-02-07T19:45:54.122480Z","updateTime":"2018-02-15T16:57:05.719151Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Toronto Raptors","fields":{"wins":{"stringValue":"41"},"pace":{"stringValue":"98.0"},"dRtg":{"stringValue":"105.1"},"rank":{"stringValue":"3"},"oRtg":{"stringValue":"113.7"},"losses":{"stringValue":"16"},"team":{"stringValue":"Toronto Raptors"}},"createTime":"2018-02-07T19:45:54.101236Z","updateTime":"2018-02-15T16:57:05.729192Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Utah Jazz","fields":{"rank":{"stringValue":"9"},"oRtg":{"stringValue":"108.1"},"losses":{"stringValue":"28"},"team":{"stringValue":"Utah Jazz"},"pace":{"stringValue":"95.4"},"wins":{"stringValue":"30"},"dRtg":{"stringValue":"106.2"}},"createTime":"2018-02-07T19:45:54.087293Z","updateTime":"2018-02-15T16:57:05.738928Z"},{"name":"projects/hoopfire-api/databases/(default)/documents/nba-teams/Washington Wizards","fields":{"team":{"stringValue":"Washington Wizards"},"wins":{"stringValue":"33"},"pace":{"stringValue":"97.2"},"dRtg":{"stringValue":"107.8"},"rank":{"stringValue":"10"},"oRtg":{"stringValue":"109.7"},"losses":{"stringValue":"24"}},"createTime":"2018-02-07T19:45:54.087090Z","updateTime":"2018-02-15T16:57:05.741598Z"}];
        //calculateAverages();

        
      
    }

  }

})();
